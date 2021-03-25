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
class TypeRegistry {
    classes = {};
    resolveType(rawType) {
        if (rawType == "MbResultType") {
            return {
                rawType: "MbResultType",
                isErrorCode: true
            }
        }
        if (this.enums.includes(rawType)) {
            return {
                rawType: rawType,
                jsType: rawType,
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
                jsType: klass.jsClassName
            }
        }
    
        const cppType = rawType.replace(/^Mb/, '');
        const jsType = cppType;
        return {
            rawType: rawType,
            jsType: jsType,
            cppType: cppType,
        };
    }

    register(classDeclaration) {
        this.classes[classDeclaration.name] = classDeclaration;
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
        typeRegistry.register(this);

        // For "extends", we inherit functions as well as the free function name.
        this.desc.functions = this.desc.functions ?? [];
        if (Array.isArray(desc.extends)) {
            this.extends = desc.extends;
        } else if (desc.extends) {
            this.extends = [desc.extends];
        } else {
            this.extends = [];
        }

        this.dependencies = this.desc.dependencies ?? [];
        for (const e of this.extends) {
            const superclass = typeRegistry.resolveClass(e);
            if (!superclass) throw "no superclass found: " + e + " -- note that the ordering of the api file is important.";
            this.desc.functions = this.desc.functions.concat(superclass.desc.functions);
            if (superclass.freeFunctionName) {
                this.freeFunctionName = superclass.freeFunctionName;
            }
        }
        if (desc.freeFunctionName) {
            this.freeFunctionName = desc.freeFunctionName;
        }
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

    get functions() {
        const result = [];
        const functions = this.desc.functions ?? [];
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
    static declaration = /(?<return>[\w\s*&]+)\s+(?<name>\w+)\(\s*(?<params>[\w\s<>,&*:]*)\s*\)/

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

        this.name = matchMethod.groups.name;
        this.returnType = new ReturnDeclaration(matchMethod.groups.return, this.typeRegistry);
        const paramDescs = matchMethod.groups.params.split(/,\s*/);

        // Note that c++ has "out" params which are simply return parameters in js
        this.params = [];
        let jsIndex = 0;
        for (const [cppIndex, paramDesc] of paramDescs.entries()) {
            if (paramDesc != "") {
                const param = new ParamDeclaration(cppIndex, jsIndex, paramDesc, this.typeRegistry, options);
                this.params.push(param);
                if (param.isJsArg) jsIndex++;
            }
        }

        let returnsCount = 0;
        if (this.returnType.isReturn) returnsCount++;
        for (const param of this.params) {
            if (param.isReturn) returnsCount++;
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
}

class TypeDeclaration {
    constructor(rawType, typeRegistry) {
        this.typeRegistry = typeRegistry;
        const type = typeRegistry.resolveType(rawType);
        Object.assign(this, type);
        if (/Array/.exec(this.rawType)) {
            this.jsType = "Array";
        } else {
            this.jsType = type.jsType;
        }
    }

    get isPointer() {
        return /\*/.test(this.ref);
    }

    get isNumber() {
        return this.rawType == "double" || this.rawType == "int" || this.rawType == "float"
    }

    get isCppString2CString() {
        return this.rawType == "char" && this.const && this.ref == "*";
    }

    get isBoolean() {
        return this.rawType == "bool"
    }

    get isArray() {
        return /Array/.test(this.rawType);
    }
}
class ParamDeclaration extends TypeDeclaration {
    static declaration = /((?<const>const)\s+)?(?<type>[\w:]+(\<(?<elementType>\w+)\>)?)\s+((?<ref>[*&]*)\s*)?(?<name>\w+)/;

    constructor(cppIndex, jsIndex, desc, typeRegistry, options) {
        const matchType = ParamDeclaration.declaration.exec(desc);
        if (!matchType) throw new Error("Parsing error: " + desc);

        super(matchType.groups.type, typeRegistry);

        this.const = matchType.groups.const;
        this.cppIndex = cppIndex;
        this.jsIndex = jsIndex;
        this.desc = desc;
        this.ref = matchType.groups.ref;
        this.name = matchType.groups.name;
        this.isReturn = this.ref == "*&";
        if (matchType.groups.elementType) {
            this.elementType = typeRegistry.resolveType(matchType.groups.elementType);
            this.elementType.isReference = /RPArray/.test(this.rawType);
        }
        Object.assign(this, options[this.name]);
    }

    get isJsArg() {
        return !this.isReturn;
    }

    get shouldAlloc() {
        return this.isReturn && this.ref == "&"
    }
}

class ReturnDeclaration extends TypeDeclaration {
    static declaration = /((?<const>const)\s+)?(?<type>\w+)(\s+(?<ref>[*&]\s*))?/;

    constructor(desc, typeRegistry) {
        const matchType = ReturnDeclaration.declaration.exec(desc);
        if (!matchType) throw new Error("Parsing error: " + desc);

        super(matchType.groups.type, typeRegistry);

        this.desc = desc;
        this.const = matchType.groups.const;
        this.ref = matchType.groups.ref;
    }

    get isReturn() {
        return !this.isErrorCode && this.rawType != 'void'
    }

    get name() {
        return "_result";
    }

    get isOnStack() {
        return this.ref != "*";
    }
}

class InitializerDeclaration {
    static declaration = /(?<params>[\w\s,&*:]*)/

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
        return true;
    }
}