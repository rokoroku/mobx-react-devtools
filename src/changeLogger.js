import mobx from 'mobx';

let logDisposer = null;

export function setLogLevel(newLevel) {
    if (newLevel === true && !logDisposer) {
        logDisposer = mobx.extras.trackTransitions(logger);
    } else if (newLevel === false && logDisposer) {
        logDisposer();
        logDisposer = null;
    }
}

function logger(change) {
    if (change.spyReportEnd === true) {
        if (typeof change.time === "number") {
            log("%ctotal time: %sms", "color:gray", change.time);
        }
        console.groupEnd();
    } else {
        const logNext = change.spyReportStart === true ? group : log;
        switch (change.type) {
            case 'action':
                // name, target, arguments
                logNext(`%caction '%s' %s`, 'color:blue', change.name, autoWrap("(", getNameForThis(change.target)));
                log(change.arguments),
                log({
                    target: change.target
                });
                trace();
                break;
            case 'transaction':
                // name, target
                logNext(`%ctransaction '%s' %s`, 'color:gray', change.name, autoWrap("(", getNameForThis(change.target)));
                break;
            case 'reaction':
                // object
                logNext(`%creaction '%s'`, 'color:green', observableName(change.object));
                trace();
                break;
            case 'compute':
                // object, target
                logNext(`%ccomputed '%s' %s`, 'color:gray', observableName(change.object), autoWrap("(", getNameForThis(change.target)));
                break;
            case 'error':
                // message
                logNext('%cerror: %s', 'color:red', change.message);
                trace();
                break;
            case 'update':
                // (array) object, index, newValue, oldValue
                // (map, obbject) object, name, newValue, oldValue
                // (value) object, newValue, oldValue
                if (mobx.isObservableArray(change.object)) {
                    logNext("updated '%s[%s]': %s (was: %s)", observableName(change.object), change.index, formatValue(change.newValue), formatValue(change.oldValue));
                } else if (mobx.isObservableObject(change.object)) {
                    logNext("updated '%s.%s': %s (was: %s)", observableName(change.object), change.name, formatValue(change.newValue), formatValue(change.oldValue));
                } else {
                    logNext("updated '%s': %s (was: %s)", observableName(change.object), change.name, formatValue(change.newValue), formatValue(change.oldValue));
                }
                console.log({
                    newValue: change.newValue,
                    oldValue: change.oldValue
                });
                trace();
                break;
            case 'splice':
                // (array) object, index, added, removed, addedCount, removedCount
                logNext("spliced '%s': index %d, added %d, removed %d", observableName(change.object), change.index, change.addedCount, change.removedCount);
                log({
                    added: change.added,
                    removed: change.removed
                });
                trace();
                break;
            case 'add':
                // (map, object) object, name, newValue
                logNext("set '%s.%s': %s", observableName(change.object), change.name, formatValue(change.newValue));
                log({
                    newValue: change.newValue
                });
                trace();
                break;
            case 'delete':
                // (map) object, name, oldValue
                logNext("removed '%s.%s' (was %s)", observableName(change.object), change.name, formatValue(change.oldValue));
                log({
                    oldValue: change.oldValue
                });
                trace();
                break;
            case 'create':
                // (value) object, newValue
                logNext("set '%s': %s", observableName(change.object), formatValue(change.newValue));
                log({
                    newValue: change.newValue
                });
                trace();
                break;
            default:
                break;
        }
    }
}

const consoleSupportsGroups = typeof console.groupCollapsed === "function";

function group() {
    console[consoleSupportsGroups ? "groupCollapsed" : "log"].apply(console, arguments);
}

function groupEnd() {
    if (consoleSupportsGroups)
        console.groupEnd();
}

function log() {
    console.log.apply(console, arguments);
}

function trace() {
    console.trace(); // TODO: use stacktrace.js or similar and strip off unrelevant stuff?
}

const closeToken = {
    "\"" : "\"",
    "'" : "'",
    "(" : ")",
    "[" : "]",
    "<" : "]",
    "#" : ""
}

function autoWrap(token, value) {
    if (!value)
        return "";
    return (token || "") + value + (closeToken[token] || "");
}

function observableName(object) {
    if (mobx.isObservableArray(object)) {
        return object.$mobx.atom.name + "@" + object.$mobx.atom.id;
    } else if (object.$mobx) {
        // array, object
        return object.$mobx.name + "@" + object.$mobx.id;
    } else {
        // map, reaction, observable value..
        return object.name + "@" + object.id;
    }
}

function formatValue(value) {
    if (isPrimitive(value))
        return value;
    else
        return autoWrap("(", getNameForThis(value));
}

function getNameForThis(who) {
    if (who && typeof who === "object") {
	    if (who && who.$mobx) {
		    return `${who.$mobx.name}#${who.$mobx.id}`;
        } else if (who.constructor) {
            return `${who.constructor.name || "object"}`;
        }
	}
	return `${typeof who}`;
}

function isPrimitive(value) {
	return value === null || value === undefined || typeof value === "string" || typeof value === "number";
}