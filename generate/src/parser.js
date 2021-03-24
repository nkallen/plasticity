import _ from 'underscore';

export default function Parse(api) {
    const typeRegistry = new TypeRegistry();
    const classes = [];
    for (const klass in api.classes) {
        classes.push(new ClassDeclaration(klass, api.classes[klass], typeRegistry));
    }
    return classes;
}
class TypeRegistry {
    classes = {};

    constructor(map) {
        this.map = {
            SimpleName: {
                jsType: "Number",
                rawType: "SimpleName",
                cppType: "SimpleName",
                isEnum: true,
            },
            MbeSpaceType: {
                jsType: "Number",
                rawType: "MbeSpaceType",
                cppType: "MbeSpaceType",
                isEnum: true
            },
            MbeStepType: {
                jsType: "Number",
                rawType: "MbeStepType",
                cppType: "MbeStepType",
                isEnum: true
            },
            ESides: {
                jsType: "Number",
                cppType: "ESides",
                rawType: "MbSNameMaker::ESides",
                isEnum: true
            }
        }
    }

    resolveType(rawType) {
        const e = this.map[rawType];
        if (e) return e;
        const cppType = rawType.replace(/^Mb/, '');
        const jsType = cppType;
        return {
            rawType: rawType,
            jsType: jsType,
            cppType: cppType,
            rawType: rawType
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
        this.desc = desc;
        this.typeRegistry = typeRegistry;
        this.rawHeader = desc.rawHeader;
        typeRegistry.register(this);

        this.extends = desc.extends;
        const superclass = typeRegistry.resolveClass(this.extends);
        if (superclass) {
            this.desc.functions = this.desc.functions ?? [];
            this.desc.functions = this.desc.functions.concat(superclass.desc.functions || []);
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

    get dependencies() {
        return this.desc.dependencies ?? [];
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
        return [];
    }
}

class FunctionDeclaration {
    static declaration = /(?<return>[\w\s*&]+)\s+(?<name>\w+)\(\s*(?<params>[\w\s,&*]*)\s*\)/

    constructor(desc, typeRegistry) {
        if (typeof desc === "object") {
            this.isManual = desc.isManual;
            desc = desc.signature;
        }

        this.desc = desc;
        this.typeRegistry = typeRegistry;
        const matchMethod = FunctionDeclaration.declaration.exec(desc);
        if (!matchMethod) throw new Error("Parsing error: " + desc);

        this.name = matchMethod.groups.name;
        this.returnType = new ReturnDeclaration(matchMethod.groups.return, this.typeRegistry);
        const paramDescs = matchMethod.groups.params.split(/,\s*/);
        this.params = [];
        let jsIndex = 0;
        for (const [cppIndex, paramDesc] of paramDescs.entries()) {
            if (paramDesc != "") {
                const param = new ParamDeclaration(cppIndex, jsIndex, paramDesc, this.typeRegistry);
                this.params.push(param);
                if (param.isJsArg) jsIndex++;
            }
        }

        let returnsCount = 0;
        if (this.returnType.isReturn) returnsCount++; 
        for (const param in this.params) {
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
                result.tpush(param);
            }
        }
        return result;
    }
}

class TypeDeclaration {
    constructor(rawType, typeRegistry) {
        this.typeRegistry = typeRegistry;
        const type = typeRegistry.resolveType(rawType);
        this.rawType = type.rawType;
        this.isEnum = type.isEnum;
        this.cppType = type.cppType;
        this.jsType = type.jsType;
    }

    get isPointer() {
        return this.ref == '*';
    }

    get isNumber() {
        return this.rawType == "double" || this.rawType == "int" || this.rawType == "float"
    }

    get isCppString2CString() {
        return this.rawType == "const char *" && this.cppType == "std::string";
    }

    get isBoolean() {
        return this.rawType == "bool"
    }
}
class ParamDeclaration extends TypeDeclaration {
    static declaration = /((?<const>const)\s+)?(?<type>\w+)\s+((?<ref>[*&])\s*)?(?<name>\w+)/;

    constructor(cppIndex, jsIndex, desc, typeRegistry) {
        const matchType = ParamDeclaration.declaration.exec(desc);
        if (!matchType) throw new Error("Parsing error: " + desc);

        super(matchType.groups.type, typeRegistry);

        this.const = matchType.groups.const;
        this.cppIndex = cppIndex;
        this.jsIndex = jsIndex;
        this.desc = desc;
        this.ref = matchType.groups.ref;
        this.name = matchType.groups.name;
    }

    get isReturn() {
        return false;
    }

    get isJsArg() {
        return !this.isReturn;
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
    static declaration = /(?<params>[\w\s,&*]*)/

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
                const param = new ParamDeclaration(cppIndex, jsIndex, paramDesc, this.typeRegistry);
                this.params.push(param);
                if (param.isJsArg) jsIndex++;
            }
        }
    }
}