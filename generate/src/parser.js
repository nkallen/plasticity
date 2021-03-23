export class Klass {
    constructor(name, desc) {
        this.name = name;
        this.desc = desc;
    }

    get cppClassName() {
        return this.name;
    }
}