import _ from 'underscore';

/*
 * Parse a description of the API (api.js), create an object model that
 * maps types from javascript to c++/node-addon-api to the raw c3d library
 */
export default function Parse(api) {
    const typeRegistry = new TypeRegistry();
    typeRegistry.enums = api.enums;
    const declarations = [];
    for (const klass in api.classes) {
        declarations.push(new ClassDeclaration(klass, api.classes[klass], typeRegistry));
    }
    for (const module in api.modules) {
        declarations.push(new ModuleDeclaration(module, api.modules[module], typeRegistry));
    }
    return declarations;
}

function cppType2jsType(cppType) {
    switch (cppType) {
        case 'bool': return 'boolean';
        case 'refcount_t':
        case 'size_t':
        case 'VERSION':
        case 'double': return 'number';
        case 'c3d::string_t': return 'string';
        case 'std::string': return 'string';
        case 'c3d::path_string': return 'string';
        default: return cppType;
    }
}

class TypeRegistry {
    classes = {};
    resolveType(rawType) {
        if (rawType === "MbResultType") {
            return {
                rawType: "MbResultType",
                jsType: "Resultype",
                isErrorCode: true
            }
        }
        if (this.enums.includes(rawType)) {
            return {
                rawType: rawType,
                jsType: rawType.replace(/^\w+::/, '').replace(/^Mbe/, ''),
                cppType: rawType,
                isEnum: true
            }
        }
        // There are a few cases like SmoothValues & ModifyValues where we have name conflicts
        // so we look up the mapping. In these cases, it's probably just an _ prefix.
        if (this.classes[rawType]) {
            const klass = this.classes[rawType];
            return {
                rawType: rawType,
                cppType: klass.cppClassName,
                jsType: klass.jsClassName,
            }
        }

        const cppType = rawType.replace(/^Mb/, '').replace(/<[^>]+>/, '');
        return {
            rawType: rawType,
            jsType: cppType2jsType(cppType),
            cppType: cppType,
        };
    }

    register(classDeclaration) {
        this.classes[classDeclaration.name] = classDeclaration;
        this.classes[classDeclaration.rawClassName] = classDeclaration;
    }

    resolveClass(className) {
        return this.classes[className];
    }
}
class ClassDeclaration {
    constructor(name, desc, typeRegistry) {
        this.name = name;
        this.ignore = desc.ignore;
        this.desc = desc;
        this.typeRegistry = typeRegistry;
        this.rawHeader = desc.rawHeader;
        this.template = desc.template;
        this.isPOD = desc.isPOD;
        typeRegistry.register(this);

        // For "extends", we inherit functions as well as the free function name.
        this.desc.functions = this.desc.functions ?? [];
        if (Array.isArray(desc.extends)) {
            // this.extends = desc.extends;
        } else if (desc.extends) {
            desc.extends = [desc.extends];
        } else {
            desc.extends = [];
        }
        this.extends = [];

        this.dependencies = this.desc.dependencies ?? [];
        this.desc.nonInheritedFunctions = this.desc.functions;
        this.desc.implements = [];
        for (const [i, e] of desc.extends.entries()) {
            const superclass = typeRegistry.resolveClass(e);
            this.extends.push(superclass);
            if (!superclass) throw "no superclass found: " + e + " -- note that the ordering of the api file is important.";
            const superclassFunctions = superclass.desc.functions;
            const inheritableFunctions = superclassFunctions.filter(f => !f.isManual).filter(f => !f.isUninheritable);
            this.desc.functions = this.desc.functions.concat(inheritableFunctions);
            const superclassFields = superclass.desc.fields || [];
            this.desc.fields = (this.desc.fields || []).concat(superclassFields);
            if (superclass.freeFunctionName) {
                this.freeFunctionName = superclass.freeFunctionName;
            }
            if (i > 0) {
                this.desc.implements = this.desc.implements.concat(inheritableFunctions); // multiple inheritance
            }
        }
        if (desc.freeFunctionName) {
            this.freeFunctionName = desc.freeFunctionName;
        }
        this.protectedDestructor = desc.protectedDestructor;
    }

    get cppClassName() {
        return this.desc.cppClassName ?? this.name;
    }

    get rawClassName() {
        return this.desc.rawClassName ?? "Mb" + this.name;
    }

    get jsClassName() {
        return this.desc.jsClassName ?? this.cppClassName;
    }

    get enum() {
        return this.desc.enum;
    }

    get functions() {
        const result = [];
        const functions = this.desc.functions ?? [];
        for (const f of functions) {
            result.push(new FunctionDeclaration(f, this.typeRegistry));
        }
        return result;
    }

    get nonInheritedFunctions() {
        const result = [];
        const functions = this.desc.nonInheritedFunctions ?? [];
        for (const f of functions) {
            result.push(new FunctionDeclaration(f, this.typeRegistry));
        }
        return result;
    }

    get implements() {
        const result = [];
        const functions = this.desc.implements ?? [];
        for (const f of functions) {
            result.push(new FunctionDeclaration(f, this.typeRegistry));
        }
        return result;
    }

    get initializers() {
        const result = [];
        const initializers = this.desc.initializers ?? [];
        for (const i of initializers) {
            result.push(new InitializerDeclaration(i, this.typeRegistry));
        }
        return result;
    }

    get fields() {
        const result = [];
        const fields = this.desc.fields ?? [];
        for (const f of fields) {
            result.push(new FieldDeclaration(f, this.typeRegistry));
        }
        return result;
    }

    get templatePrefix() {
        return 'class';
    }
}

// A class with only static methods
class ModuleDeclaration extends ClassDeclaration {
    get templatePrefix() {
        return 'module';
    }

    get functions() {
        const result = [];
        const functions = this.desc.functions ?? [];
        for (const f of functions) {
            const fd = new FunctionDeclaration(f, this.typeRegistry);
            fd.isStatic = true;
            result.push(fd);
        }
        return result;
    }
}

class FunctionDeclaration {
    static declaration = /(?<return>[\w\s*&:]+)\s+(?<name>[\w:]+)\(\s*(?<params>[\w\s<>,&*:=()]*)\s*\)/

    constructor(desc, typeRegistry) {
        let options = {};
        if (typeof desc === "object") {
            options = desc;
            Object.assign(this, options);
            desc = desc.signature;
        }

        this.desc = desc;
        this.typeRegistry = typeRegistry;
        const matchMethod = FunctionDeclaration.declaration.exec(desc);
        if (!matchMethod) throw new Error("Parsing error: " + desc);

        this.rawName = matchMethod.groups.name;
        this.name = this.rawName.split(/::/)[1] ?? matchMethod.groups.name;
        this.jsName = options.jsName ?? this.name;

        this.returnType = new ReturnDeclaration(matchMethod.groups.return, this.typeRegistry, options.return);
        const paramDescs = matchMethod.groups.params.split(/,\s*/);

        // Note that c++ has "out" params which are simply return parameters in js
        this.params = [];
        let jsIndex = 0;
        for (const [cppIndex, paramDesc] of paramDescs.entries()) {
            if (paramDesc == "") continue;
            const param = new ParamDeclaration(cppIndex, jsIndex, paramDesc, this.typeRegistry, options);
            this.params.push(param);
            if (param.isJsArg) jsIndex++;
        }

        let returnsCount = 0;
        if (this.returnType.isReturn) returnsCount++;
        for (const param of this.params) {
            if (param.isReturn && !param.ignore) returnsCount++;
        }
        this.returnsCount = returnsCount;
    }

    get returns() {
        const result = [];
        if (this.returnType.isReturn) result.push(this.returnType);
        return result.concat(this.outParams);
    }

    get outParams() {
        const result = [];
        for (const param of this.params) {
            if (param.isReturn) {
                result.push(param);
            }
        }
        return result;
    }

    get cppName() {
        return this.name;
    }
}

class TypeDeclaration {
    constructor(rawType, typeRegistry) {
        this.typeRegistry = typeRegistry;
        const type = typeRegistry.resolveType(rawType);

        Object.assign(this, type);

        if (/Array\</.exec(this.rawType) || /List/.exec(this.rawType) || /LIterator/.test(this.rawType)) {
            this.jsType = "Array";
        } else {
            this.jsType = type.jsType;
        }
    }

    get isPointer() {
        return /\*/.test(this.ref);
    }

    get isNumber() {
        return this.rawType == "double" || this.rawType == "int" || this.rawType == "float" || this.rawType == "long" || this.rawType == "refcount_t" || this.rawType == "size_t" || this.rawType == "VERSION" || this.rawType == "uint" || this.rawType == "SimpleName" || this.rawType == "ptrdiff_t" || this.rawType === "uint8"
    }

    get isCppString2CString() {
        return this.rawType == "char" && this.const && this.ref == "*";
    }

    get isC3dString() {
        return this.rawType == "c3d::string_t"
    }

    get isBasicString() {
        return this.rawType == "std::string"
    }

    get isPathString() {
        return this.rawType == "c3d::path_string"
    }

    get isBoolean() {
        return this.rawType == "bool"
    }

    get isArray() {
        return /Array/.test(this.rawType) || /List/.test(this.rawType) || /LIterator/.test(this.rawType) || /std::vector/.test(this.rawType);
    }

    get isSPtr() {
        return /SPtr/.test(this.rawType);
    }

    get isBuffer() {
        return this.rawType === "char" && this.const && this.ref === "*&" ||
            this.rawType === "void" && this.const && this.ref === "*";
    }

    get isNumberPair() {
        return /IndicesPair/.test(this.rawType);
    }

    get isStructArray() {
        return /SArray/.test(this.rawType);
    }

    get isIterator() {
        return /LIterator/.test(this.rawType);
    }

    get isVector() {
        return /std::vector/.test(this.rawType);
    }

    get isPrimitive() {
        return this.isBoolean || this.isNumber || this.isEnum;
    }
}
class ParamDeclaration extends TypeDeclaration {
    static declaration = /((?<const>const)\s+)?(?<type>[\w:]+(\<((?<elementConst>const)\s+)?(?<elementType>\w+)\>)?)\s+((?<ref>[*&]*)\s*)?(?<name>\w+)(\s+=\s*(?<default>[\w:()]+))?/;

    constructor(cppIndex, jsIndex, desc, typeRegistry, options) {
        const matchType = ParamDeclaration.declaration.exec(desc);
        if (!matchType) throw new Error("Parsing error: " + desc);

        super(matchType.groups.type, typeRegistry);

        this.klass = typeRegistry.resolveClass(this.jsType);
        this.const = matchType.groups.const;
        this.cppIndex = cppIndex;
        this.jsIndex = jsIndex;
        this.desc = desc;
        this.ref = matchType.groups.ref;
        this.name = matchType.groups.name;

        if (this.ref === "*&") {
            if (options[this.name]?.isInput) {
                this.ref = "*";
            } else {
                this.isReturn = true;
            }
        }
        this.default = matchType.groups.default;
        if (matchType.groups.elementType) {
            this.elementType = typeRegistry.resolveType(matchType.groups.elementType);
            this.elementType.isReference = /RPArray|LIterator/.test(this.rawType);
            this.elementType.klass = typeRegistry.resolveClass(this.elementType.jsType);
        }
        Object.assign(this, options[this.name]);
        if (this.isBuffer) this.jsType = "Buffer";
    }

    get isOptional() {
        return this.default != null;
    }

    get isJsArg() {
        return !this.isReturn;
    }

    get shouldAlloc() {
        if (this.isPrimitive) return false;
        if (this.isSPtr) return false;
        return (this.isReturn && this.ref == "&") || (this.isReturn && this.isArray)
    }

}

class ReturnDeclaration extends TypeDeclaration {
    static declaration = /((?<const>const)\s+)?(?<type>[\w:]+)(\s+(?<ref>[*&]\s*))?/;

    constructor(desc, typeRegistry, options) {
        const matchType = ReturnDeclaration.declaration.exec(desc);
        if (!matchType) throw new Error("Parsing error: " + desc);

        super(matchType.groups.type, typeRegistry);

        this.desc = desc;
        this.options = options;
        if (this.options?.isErrorBool) this.isErrorBool = true;
        if (this.options?.ignore) this.ignore = true;
        this.const = matchType.groups.const;
        this.ref = matchType.groups.ref;
    }

    get isReturn() {
        return !this.isErrorCode && !this.isErrorBool && this.rawType != 'void' && !this.ignore;
    }

    get name() {
        return this.options?.name ?? "_result";
    }

    get isOnStack() {
        if (this.options?.isOnStack !== undefined) return this.options.isOnStack;
        return this.ref != "*";
    }
}

class InitializerDeclaration {
    static declaration = /(?<params>[\w\s,&*:<>=()]*)/

    constructor(desc, typeRegistry) {
        this.desc = desc;
        this.typeRegistry = typeRegistry;
        const matchMethod = InitializerDeclaration.declaration.exec(this.desc);
        if (!matchMethod) throw new Error("Parsing error: " + desc);

        const paramDescs = matchMethod.groups.params.split(/,\s*/);
        this.params = [];
        let jsIndex = 0;
        for (const [cppIndex, paramDesc] of paramDescs.entries()) {
            if (paramDesc != "") {
                const param = new ParamDeclaration(cppIndex, jsIndex, paramDesc, this.typeRegistry, {});
                this.params.push(param);
                if (param.isJsArg) jsIndex++;
            }
        }
    }
}

class FieldDeclaration extends ParamDeclaration {
    constructor(desc, typeRegistry) {
        super(0, 0, desc, typeRegistry, {});
    }

    get isOnStack() {
        return this.ref != "*";
    }
}