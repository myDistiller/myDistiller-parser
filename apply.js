// @ts-check
const regexpTree = require('regexp-tree')

function parse(tree) {
    if (Array.isArray(tree)) {
        return tree.reduce((acc, el) => Object.assign(acc, parse(el)), {})
    } else if (tree.type === 'Group' && tree.capturing) {
        return { [tree.name.split('_')[0]]: { regex: regexpTree.generate(tree.expression || tree.expressions), data: parse(tree.expression || tree.expressions) } }
    } else if (tree.expressions) {
        return parse(tree.expressions)
    } else if (tree.expression) {
        return parse(tree.expression)
    } else if (tree.left && tree.right) {
        return parse([tree.left, tree.right])
    }
}

function applyTree(tree, text) {
    let result = {}
    for (let name of Object.keys(tree)) {
        let entry = tree[name]

        let regex = new RegExp(entry.regex, 'gu')
        let matches = text.match(regex)
        if (!matches) {
            matches = []
        }
        if (entry.data && Object.keys(entry.data).length > 0) {
            let ret = []
            for (let match of matches) {
                ret.push(getEntry(entry.data, match, entry.regex))
            }
            result[name] = ret.map(str => str.trim())
        } else {
            result[name] = matches.map(str => str.trim())
        }
    }
    return result
}

function getEntry(tree, text, parentRegex) {
    let ret = {}
    let regex = new RegExp(parentRegex, 'gu')
    for (let name of Object.keys(tree)) {
        let element = tree[name]
        let match, matches = []
        while ((match = regex.exec(text)) !== null) {
            for (let group of Object.keys(match.groups)) {
                if (group.split('_')[0] === name) {
                    matches.push(match.groups[group])
                }
            }
        }

        if (element.data && Object.keys(element.data).length > 0) {
            if (matches.length > 1) {
                ret[name] = matches.map(e => getEntry(element.data, e, element.regex))
            } else {
                ret[name] = getEntry(element.data, matches[0], element.regex)
            }
        } else {
            if (matches.length > 1) {
                ret[name] = matches
            } else {
                ret[name] = matches[0]
            }
        }
    }
    return ret
}

function apply(regex, text) {
    let tree = regexpTree.parse(new RegExp(regex, 'gu'))
    let regexes = parse(tree.body)
    return applyTree(regexes, text)
}

module.exports = apply