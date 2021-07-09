import { calculateSpecificity, validateSelector } from 'clear-cut';
import { CompositeDisposable, Disposable } from 'event-kit';

let SequenceCount = 0;

export default class CommandRegistry {
    rootNode!: Window | HTMLElement;
    registeredCommands = new Map<String, boolean>();
    selectorBasedListenersByCommandName = new Map<String, SelectorBasedListener[]>();
    inlineListenersByCommandName = new Map<String, WeakMap<HTMLElement | Window, InlineListener[]>>();

    constructor() {
        this.handleCommandEvent = this.handleCommandEvent.bind(this);
    }

    attach(rootNode: Window | HTMLElement) {
        this.rootNode = rootNode;
        for (const command in this.selectorBasedListenersByCommandName) {
            this.commandRegistered(command);
        }
    }

    destroy() {
        for (const commandName in this.registeredCommands) {
            this.rootNode.removeEventListener(
                commandName,
                this.handleCommandEvent,
                true
            );
        }
    }

    add(target: HTMLElement | string, commands: Record<string, () => void>): Disposable {
        const disposable = new CompositeDisposable();
        for (const name in commands) {
            const dispo = this.addOne(target, name, commands[name]);
            disposable.add(dispo);
        }
        return disposable;
    }

    addOne(target: string | HTMLElement, commandName: string, listener: () => void): Disposable {
        if (listener == null) {
            throw new Error('Cannot register a command with a null listener.');
        }

        if (typeof target === 'string') {
            validateSelector(target);
            return this.addSelectorBasedListener(target, commandName, listener);
        } else {
            return this.addInlineListener(target, commandName, listener);
        }
    }

    addSelectorBasedListener(selector: string, commandName: string, listener: () => void): Disposable {
        if (!this.selectorBasedListenersByCommandName.has(commandName)) {
            this.selectorBasedListenersByCommandName.set(commandName, new Array<SelectorBasedListener>());
        }
        const listenersForCommand = this.selectorBasedListenersByCommandName.get(commandName)!;
        const selectorListener = new SelectorBasedListener(selector, commandName, listener);
        listenersForCommand.push(selectorListener);

        this.commandRegistered(commandName);

        return new Disposable(() => {
            listenersForCommand.splice(listenersForCommand.indexOf(selectorListener), 1);
            if (listenersForCommand.length === 0) {
                this.selectorBasedListenersByCommandName.delete(commandName);
            }
        });
    }

    addInlineListener(element: HTMLElement, commandName: string, listener: () => void) {
        if (this.inlineListenersByCommandName.get(commandName) == null) {
            this.inlineListenersByCommandName.set(commandName, new WeakMap());
        }

        const listenersForCommand = this.inlineListenersByCommandName.get(commandName)!;
        let listenersForElement = listenersForCommand.get(element);
        if (!listenersForElement) {
            listenersForElement = [];
            listenersForCommand.set(element, listenersForElement);
        }
        const inlineListener = new InlineListener(commandName, listener);
        listenersForElement.push(inlineListener);

        this.commandRegistered(commandName);

        return new Disposable(() => {
            listenersForElement!.splice(
                listenersForElement!.indexOf(inlineListener),
                1
            );
            if (listenersForElement!.length === 0) {
                listenersForCommand.delete(element);
            }
        });
    }

    handleCommandEvent(event: Event) {
        let propagationStopped = false;
        let immediatePropagationStopped = false;
        let matched = [];
        let currentTarget = event.target as HTMLElement | Window;

        const dispatchedEvent = new CustomEvent(event.type, { bubbles: true });
        Object.defineProperty(dispatchedEvent, 'eventPhase', {
            value: Event.BUBBLING_PHASE
        });
        Object.defineProperty(dispatchedEvent, 'currentTarget', {
            get() {
                return currentTarget;
            }
        });
        Object.defineProperty(dispatchedEvent, 'target', { value: currentTarget });
        Object.defineProperty(dispatchedEvent, 'preventDefault', {
            value() {
                return event.preventDefault();
            }
        });
        Object.defineProperty(dispatchedEvent, 'stopPropagation', {
            value() {
                event.stopPropagation();
                propagationStopped = true;
            }
        });
        Object.defineProperty(dispatchedEvent, 'stopImmediatePropagation', {
            value() {
                event.stopImmediatePropagation();
                propagationStopped = true;
                immediatePropagationStopped = true;
            }
        });

        for (const key of Object.keys(event)) {
            if (!(key in dispatchedEvent)) {
                // dispatchedEvent[key] = event[key];
            }
        }

        while (true) {
            if (currentTarget === window || propagationStopped) break;
            const currentElement = currentTarget as HTMLElement;

            const commandInlineListeners = this.inlineListenersByCommandName.get(event.type)?.get(currentTarget) ?? [];

            const selectorBasedListeners: (InlineListener | SelectorBasedListener)[] = (this.selectorBasedListenersByCommandName.get(event.type) || [])
                .filter(listener => listener.matchesTarget(currentElement))
                .sort((a, b) => a.compare(b));
            const listeners = selectorBasedListeners.concat(commandInlineListeners);

            // Call inline listeners first in reverse registration order,
            // and selector-based listeners by specificity and reverse
            // registration order.
            for (let i = listeners.length - 1; i >= 0; i--) {
                const listener = listeners[i];
                if (immediatePropagationStopped) break;

                matched.push(listener.listener.call(currentTarget, dispatchedEvent));
            }

            currentTarget = currentElement.parentElement || window;
        }

        return matched.length > 0 ? Promise.all(matched) : null;
    }

    commandRegistered(commandName: string) {
        if (this.rootNode != null && !this.registeredCommands.has(commandName)) {
            this.rootNode.addEventListener(commandName, this.handleCommandEvent, {
                capture: true
            });
            return (this.registeredCommands.set(commandName, true));
        }
    }
};

class SelectorBasedListener {
    selector: string;
    commandName: string;
    listener: (e: CustomEvent) => void;
    specificity: number;
    sequenceNumber: number;

    constructor(selector: string, commandName: string, listener: (e: CustomEvent) => void) {
        this.selector = selector;
        this.listener = listener;
        this.commandName = commandName;
        this.specificity = calculateSpecificity(this.selector);
        this.sequenceNumber = SequenceCount++;
    }

    compare(other: SelectorBasedListener) {
        return (
            this.specificity - other.specificity ||
            this.sequenceNumber - other.sequenceNumber
        );
    }

    matchesTarget(target: HTMLElement) {
        return target.matches(this.selector)
    }
}

class InlineListener {
    constructor(
        private readonly commandName: string,
        readonly listener: () => void) {
    }
}