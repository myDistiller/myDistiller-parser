// @ts-check
const { ParseError } = require('./error.js')

class InputStream {
    constructor(input, min = 0, max = Infinity) {
        this.input = input
        this.pos = min
        this.line = 1
        this.col = 1
        this.max = max
    }

    next() {
        const ch = this.input.charAt(this.pos++)
        if (ch === '\n') {
            this.line++
            this.col = 1
        } else {
            this.col++
        }
        return ch
    }

    peek() {
        return this.input.charAt(this.pos)
    }

    eof() {
        return this.peek() == '' || this.pos >= this.max
    }

    error(msg) {
        throw new ParseError(msg, this.line, this.col)
    }

    readWhile(predicate = ch => true) {
        let str = ''
        while (!this.eof() && predicate(this.peek())) {
            str += this.next()
        }
        return str
    }

    readEscaped(end, error = true) {
        let str = ''
        this.next()
        while (true) {
            if (this.eof() || this.peek() === '\n') {
                if (error) {
                    this.error(`Missing closing ${end}`)
                }
                break
            }
            const ch = this.next()
            if (ch === '\\') {
                let next = this.next()
                if (next === end) {
                    str += next
                } else {
                    str += `\\${next}`
                }
            } else if (ch === end) {
                break
            } else {
                str += ch
            }
        }
        return str
    }

    copy(maxRange = Infinity) {
        const stream = new InputStream(this.input)
        stream.pos = this.pos
        stream.line = this.line
        stream.col = this.col
        stream.max = Math.min(this.max, maxRange)
        return stream
    }
}

function parse(str) {
    const stream = new InputStream(str)
    let result = []
    while (!stream.eof()) {
        result.push({ type: 'assignment', variables: parseVariables(stream), value: processExpression(parseExpression(stream)) })
    }
    return result
}
function parseVariables(stream) {
    const result = []
    while (true) {
        const start = stream.col
        const line = stream.line
        const variableName = stream.readWhile(ch => !contains(ch, ",=#")).trim()
        if (variableName !== '') {
            if (!/^[!]{0,1}[a-zA-Z][a-zA-Z0-9]*$/.test(variableName)) {
                stream.error(`Invalid variable '${variableName}'`)
            }
            result.push({ type: 'variable', line: line, start: start, visible: !variableName.startsWith('!'), value: variableName.replace('!', ''), end: stream.col })
        }
        if (stream.peek() === '#' || stream.eof()) {
            break
        }
        if (stream.peek() === '=') {
            stream.next()
            break
        }
        stream.next()
    }
    return result
}
function parseExpression(stream) {
    const result = []
    while (true) {
        stream.readWhile(ch => contains(ch, ' \t'))
        if (stream.eof()) {
            break
        }
        const ch = stream.peek()
        if (ch === '#') {
            result.push(readComment(stream))
        } else if (ch === '"') {
            result.push(readString(stream))
        } else if (ch === '\'') {
            result.push(readRegex(stream))
        } else if (ch === '(') {
            result.push({ type: 'expression', line: stream.line, start: stream.col, value: parseExpression(readParenthesis(stream)), end: stream.col - 1 })
        } else if (ch === '.') {
            result.push({ type: 'dot', line: stream.line, start: stream.col, value: stream.next(), end: stream.col - 1 })
        } else if (ch === ',') {
            result.push({ type: 'comma', line: stream.line, start: stream.col, value: stream.next(), end: stream.col - 1 })
        } else if (ch === '?') {
            result.push({ type: 'questionmark', line: stream.line, start: stream.col, value: stream.next(), end: stream.col - 1 })
        } else if (ch === ':') {
            result.push(readLabel(stream))
        } else if (ch === ';') {
            result.push({ type: 'semicolon', line: stream.line, start: stream.col, value: stream.next(), end: stream.col - 1 })
        } else if (/[a-zA-Z]/.test(ch)) {
            result.push(readVariable(stream))
        } else if (ch === '\n') {
            stream.next()
            break
        } else {
            stream.error(`Unexpected character '${ch}'`)
        }
    }
    return result
}
function readParenthesis(stream) {
    let depth = 1
    let ch
    stream.next()
    let result = stream.copy()
    while (!stream.eof()) {
        ch = stream.next()
        if (ch === '(') {
            depth++
        } else if (ch === ')') {
            depth--
            if (depth === 0) {
                return result.copy(stream.pos - 1)
            }
        }
    }
    stream.error('Missing closing parenthesis')
}
function readComment(stream) {
    stream.next()
    return { type: 'comment', line: stream.line, start: stream.col - 1, value: stream.readWhile(ch => ch != '\n'), end: stream.col - 1 }
}
function readString(stream) {
    return { type: 'string', line: stream.line, start: stream.col, value: stream.readEscaped('"'), end: stream.col - 1 }
}
function readRegex(stream) {
    return { type: 'regex', line: stream.line, start: stream.col, value: stream.readEscaped('\''), end: stream.col - 1 }
}
function readLabel(stream) {
    let startIndex = stream.col
    stream.next()
    let labelName = stream.readWhile(ch => /[a-zA-Z0-9]/.test(ch))
    if (labelName === '') {
        stream.error('Unnamed label')
    }
    return { type: 'label', line: stream.line, start: startIndex, value: labelName, end: stream.col - 1 }
}
function readVariable(stream) {
    return { type: 'variable', line: stream.line, start: stream.col, value: stream.readWhile(ch => /[a-zA-Z0-9]/.test(ch)), end: stream.col - 1 }
}
function contains(char, values) {
    return values.indexOf(char) >= 0
}
function processExpression(expression) {
    if (Array.isArray(expression)) {
        expression = optionalExpression(expression)
        expression = labelExpression(expression)
        expression = groupExpressionType(expression, "semicolon");
        expression = groupExpressionType(expression, "comma");
        expression = groupExpressionType(expression, "dot");

        for (let i = 0; i < expression.length; i++) {
            expression[i] = processExpression(expression[i])
        }
        return expression
    }
    if (['expression', 'semicolon', 'comma', 'dot', 'label', 'questionmark'].indexOf(expression.type) > -1) {
        expression.value = processExpression(expression.value)
    }
    return expression
}
function groupExpressionType(expression, expressionType) {
    let tmp = []
    for (let i = 0; i < expression.length; i++) {
        if (expression[i].type === expressionType && !Array.isArray(expression[i].value)) {
            if (expression[i - 1] && expression[i + 1]) {
                if (tmp[tmp.length - 1] && tmp[tmp.length - 1].type === expressionType && Array.isArray(tmp[tmp.length - 1].value)) {
                    tmp[tmp.length - 1].value.push(expression[i + 1]);
                } else {
                    tmp.push({
                        type: expressionType,
                        start: expression[i - 1].start,
                        line: expression[i - 1].line,
                        value: [expression[i - 1], expression[i + 1]],
                        end: expression[i + 1].end
                    })
                }
                if (i + 1 < expression.length) {
                    i++
                } else {
                    break
                }
            } else {
                if (!expression[i - 1]) {
                    throw new ParseError(`Missing left-hand side of expression '${expression[i].type}'`, expression[i].line, expression[i].start)
                } else {
                    throw new ParseError(`Missing right-hand side of expression '${expression[i].type}'`, expression[i].line, expression[i].start)
                }
            }
        } else if (expression[i + 1] && (expression[i + 1].type !== expressionType || Array.isArray(expression[i + 1].value)) || i === expression.length - 1) {
            tmp.push(expression[i])
        }
    }
    return tmp
}
function labelExpression(expr) {
    let expression = expr
    for (let i = 0; i < expression.length; i++) {
        if (expression[i].type === 'label' && !Array.isArray(expression[i].value)) {
            if (expression[i - 1]) {
                expression.splice(i - 1, 2, {
                    type: 'label',
                    label: expression[i].value,
                    start: expression[i - 1].start,
                    line: expression[i - 1].line,
                    value: [expression[i - 1]],
                    end: expression[i].end
                });
                if (i + 1 < expression.length) {
                    i++
                } else {
                    break
                }
            }
        }
    }
    return expression
}
function optionalExpression(expr) {
    let expression = expr
    for (let i = 0; i < expression.length; i++) {
        if (expression[i].type === 'questionmark' && !Array.isArray(expression[i].value)) {
            if (expression[i + 1]) {
                expression.splice(i, 2, {
                    type: 'questionmark',
                    start: expression[i].start,
                    line: expression[i].line,
                    value: [expression[i + 1]],
                    end: expression[i + 1].end
                });
                if (i + 1 < expression.length) {
                    i++
                } else {
                    break
                }
            }
        }
    }
    return expression
}


module.exports = { InputStream, parse }