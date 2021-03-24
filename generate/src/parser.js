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
    constructor(map) {
        this.map = {
            SimpleName: {
                jsType: "Number",
                cppType: "SimpleName",
                isEnum: true,
            }
        }
    }

    rawType2cppType(rawType) {
        const e = this.map[rawType];
        if (e) return e;
        const cppType = rawType.replace(/^Mb/, '');
        const jsType = cppType;
        return {
            jsType: jsType,
            cppType: cppType,
            rawType: rawType
        };
    }
}
class ClassDeclaration {
    constructor(name, desc, typeRegistry) {
        this.name = name;
        this.desc = desc;
        this.typeRegistry = typeRegistry;
        this.extends = desc.extends;
        this.rawHeader = desc.rawHeader;
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
            result.push(new FunctionDeclaration(f, this.typeRegistry))
        }
        return result;
    }

    get fields() {
        return [];
    }

    get initializers() {
        return [];
    }
}

class FunctionDeclaration {
    static methodDeclaration = /(?<return>[\w\s*&]+)\s+(?<name>\w+)\(\s*(?<params>[\w\s,&*]*)\s*\)/

    constructor(desc, typeRegistry) {
        this.desc = desc;
        this.typeRegistry = typeRegistry;
        const matchMethod = FunctionDeclaration.methodDeclaration.exec(this.desc);
        if (!matchMethod) {
            console.log(this.desc);
            throw this.desc;
        }
        this.name = matchMethod.groups.name;
        this.returnType = new ReturnDeclaration(matchMethod.groups.return, this.typeRegistry);
        const paramDescs = matchMethod.groups.params.split(/,\s*/);
        this.params = [];
        for (const [index, paramDesc] of paramDescs.entries()) {
            if (paramDesc != "") {
                this.params.push(new ParamDeclaration(index, paramDesc, this.typeRegistry));
            }
        }

        let returnsCount = 0;
        if (!this.returnType.isErrorCode && this.returnType.rawType != 'void') returnsCount++; 
        for (const param in this.params) {
            if (param.isReturn) returnsCount++;
        }
        this.returnsCount = returnsCount;
    }

    get returns() {
        return [];
    }
}

class TypeDeclaration {
    constructor(rawType, typeRegistry) {
        this.typeRegistry = typeRegistry;
        const type = typeRegistry.rawType2cppType(rawType);
        this.rawType = rawType;
        this.isEnum = type.isEnum;
        this.cppType = type.cppType;
        this.jsType = type.jsType;
    }

    get isPointer() {
        return this.ref == '*';
    }
}
class ParamDeclaration extends TypeDeclaration {
    static typeDeclaration = /((?<const>const)\s+)?(?<type>\w+)\s+((?<ref>[*&])\s*)?(?<name>\w+)/;

    constructor(index, desc, typeRegistry) {
        const matchType = ParamDeclaration.typeDeclaration.exec(desc);
        if (!matchType) throw desc;

        super(matchType.groups.type, typeRegistry);

        this.const = matchType.groups.const;
        this.cppIndex = index;
        this.desc = desc;
        this.ref = matchType.groups.ref;
        this.name = matchType.groups.name;
    }

    get isReturn() {
        return false;
    }

}

class ReturnDeclaration extends TypeDeclaration {
    static typeDeclaration = /((?<const>const)\s+)?(?<type>\w+)(\s+(?<ref>[*&]\s*))?/;

    constructor(desc, typeRegistry) {
        const matchType = ReturnDeclaration.typeDeclaration.exec(desc);
        if (!matchType) throw desc;

        super(matchType.groups.type, typeRegistry);

        this.desc = desc;
        this.const = matchType.groups.const;
        this.ref = matchType.groups.ref;
    }
}