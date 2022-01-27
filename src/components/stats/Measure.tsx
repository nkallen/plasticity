import Stats from 'stats.js';

const map = new Map<string, Stats>();

export const Measure = {
    get(name: string) {
        if (map.has(name))
            return map.get(name)!;
        else {
            const stats = new Stats();
            stats.dom.setAttribute('style', '');
            stats.dom.setAttribute('class', 'shadow-md inline-block');
            map.set(name, stats);
            return stats;
        }
    }
};
