// @ts-check
const { CompileError } = require('./error.js')
const { parse } = require('./parser.js')

function compileAll(data) {
    let tree = data
    if (typeof data === 'string') {
        tree = parse(data)
    }
    const scope = compile(tree)
    return '(?:' + Object.keys(scope).map(key => `\\b${scope[key]}\\b`).join('|') + ')'
}

function compile(data) {
    if (data === undefined) {
        throw new CompileError(`Incorrect function call. Data not defined.`)
    }

    let tree = data
    if (typeof data === 'string') {
        tree = parse(data)
    }

    const scope = {}

    const counter = { value: 0 }

    for (let assignment of tree) {
        for (let variable of assignment.variables) {
            if (scope[variable.value]) {
                throw new CompileError(`Variable '${variable.value}' is already defined`)
            }
            const regex = processExpression(assignment.value, variable, tree, scope, counter);
            if (regex === '') {
                throw new CompileError(`Variable '${variable.value}' has no value`)
            }
            if (variable.visible) {
                scope[variable.value] = `(?<${variable.value}_${counter.value++}>${regex})`
            } else {
                scope[variable.value] = `(?:${regex})`
            }
        }
    }

    return scope
}

function processExpression(expression, variable, tree, scope, counter, regex = '') {
    if (Array.isArray(expression)) {
        for (let expr of expression) {
            regex = processExpression(expr, variable, tree, scope, counter, regex)
        }
        return regex
    }
    if (expression.type === 'expression') {
        regex = processExpression(expression.value, variable, tree, scope, counter, regex)
        return regex
    }

    if (expression.type === 'string') {
        regex = `${regex}${escapeRegExp(expression.value)}`
    } else if (expression.type === 'regex') {
        try {
            new RegExp(expression.value)
        } catch (err) {
            throw new CompileError(err.message)
        }
        regex = `${regex}${expression.value}`
    } else if (expression.type === 'variable') {
        const assignment = tree.find(assignment => assignment.variables.find(variable => variable.value === expression.value))
        if (!assignment) {
            throw new CompileError(`Variable '${expression.value}' is not defined`)
        }
        const v = assignment.variables.find(variable => variable.value === expression.value)
        if (!v) {
            throw new CompileError(`Variable '${expression.value}' is not defined`)
        }
        if (v.visible) {
            regex = `${regex}(?<${expression.value}_${counter.value++}>${processExpression(assignment.value, v, tree, scope, counter)})`
        } else {
            regex = `${regex}(?:${processExpression(assignment.value, v, tree, scope, counter)})`
        }
    } else if (expression.type === 'dot') {
        regex = `${regex}(?:${expression.value.map(e => processExpression(e, variable, tree, scope, counter)).join('\\s*\\b')})`
    } else if (expression.type === 'semicolon') {
        regex = `${regex}(?:${expression.value.map(e => processExpression(e, variable, tree, scope, counter)).join('|')})`
    } else if (expression.type === 'comma') {
        regex = `${regex}(?:(?:${expression.value.map(e => processExpression(e, variable, tree, scope, counter)).join('|')})\\s*\\b)+`
    } else if (expression.type === 'label') {
        regex = `${regex}(?<${expression.label}_${counter.value++}>${processExpression(expression.value, variable, tree, scope, counter)})`
    } else if (expression.type === 'questionmark') {
        regex = `${regex}(?:${processExpression(expression.value, variable, tree, scope, counter)}){0,1}`
    }
    return regex
}

const reRegExpChar = /[\\^$.*+?()[\]{}|]/g
const reHasRegExpChar = RegExp(reRegExpChar.source)

function escapeRegExp(string) {
  return (string && reHasRegExpChar.test(string)) ? string.replace(reRegExpChar, '\\$&') : (string || '')
}

module.exports = { compile, compileAll }