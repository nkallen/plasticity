import _ from 'underscore';
export class ClassDeclaration {
    constructor(name, desc) {
        this.desc = desc;
        this.name = name;
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
            result.push(new FunctionDeclaration(f))
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

    constructor(desc) {
        this.desc = desc;
        const matchMethod = FunctionDeclaration.methodDeclaration.exec(this.desc);
        if (!matchMethod) {
            console.log(this.desc);
            throw this.desc;
        }
        this.name = matchMethod.groups.name;
        this.returnType = new ReturnDeclaration(matchMethod.groups.return);
        const paramDescs = matchMethod.groups.params.split(/,\s*/);
        this.params = [];
        for (const paramDesc of paramDescs) {
            if (paramDesc != "") {
                this.params.push(new ParamDeclaration(paramDesc));
            }
        }
    }
}

class ParamDeclaration {
    static typeDeclaration = /((?<const>const)\s+)?(?<type>\w+)\s+((?<ref>[*&])\s*)?(?<name>\w+)/;

    constructor(desc) {
        this.desc = desc;
        const matchType = ParamDeclaration.typeDeclaration.exec(this.desc);
        if (!matchType) {
            throw this.desc;
        }
        this.const = matchType.groups.const;
        this.type = matchType.groups.type;
        this.ref = matchType.groups.ref;
        this.name = matchType.groups.name;
    }

    get cppClassName() {
        return this.type.replace(/^Mb/, '');
    }
}

class ReturnDeclaration {
    static typeDeclaration = /((?<const>const)\s+)?(?<type>\w+)(\s+(?<ref>[*&]\s*))?/;

    constructor(desc) {
        this.desc = desc;
        const matchType = ReturnDeclaration.typeDeclaration.exec(this.desc);
        if (!matchType) {
            // throw this.desc;
        }
        this.const = matchType.groups.const;
        this.type = matchType.groups.type;
        this.ref = matchType.groups.ref;
    }
}