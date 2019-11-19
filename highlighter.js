// @ts-check
const { InputStream } = require('./parser.js')

function highlight(str) {
    const stream = new InputStream(str)

    const result = []
    while (true) {
        stream.readWhile(ch => /\s/.test(ch))
        if (stream.eof()) {
            break
        }
        const ch = stream.peek()
        let start = stream.col
        if (ch === '#') {
            stream.readWhile(ch => ch !== '\n')
            result.push({ type: 'comment', start: start, line: stream.line, end: stream.col - 1 })
        } else if (ch === '"') {
            stream.readEscaped('"', false)
            result.push({ type: 'string', start: start, line: stream.line, end: stream.col - 1 })
        } else if (ch === '\'') {
            stream.readEscaped('\'', false)
            result.push({ type: 'regex', start: start, line: stream.line, end: stream.col - 1 })
        } else if (ch === '=') {
            result.push({ type: 'equals', line: stream.line, start: start, end: start })
            stream.next()
        } else if (ch === '(') {
            result.push({ type: 'parenthesis', line: stream.line, start: start, end: start })
            stream.next()
        } else if (ch === ')') {
            result.push({ type: 'parenthesis', line: stream.line, start: start, end: start })
            stream.next()
        } else if (ch === '.') {
            result.push({ type: 'dot', line: stream.line, start: start, end: start })
            stream.next()
        } else if (ch === ',') {
            result.push({ type: 'comma', line: stream.line, start: start, end: start })
            stream.next()
        } else if (ch === '?') {
            result.push({ type: 'questionmark', line: stream.line, start: start, end: start })
            stream.next()
        } else if (ch === ':') {
            stream.next()
            stream.readWhile(ch => /[a-zA-Z0-9]/.test(ch))
            result.push({ type: 'label', line: stream.line, start: start, end: stream.col - 1 })
        } else if (ch === ';') {
            result.push({ type: 'semicolon', line: stream.line, start: start, end: start })
            stream.next()
        } else if (/[a-zA-Z!]/.test(ch)) {
            let visible = ch !== '!'
            stream.readWhile(ch => /[a-zA-Z0-9!]/.test(ch))
            result.push({ type: 'variable', visible: visible, line: stream.line, start: start, end: stream.col - 1 })
        } else if (ch === '\n') {
            stream.next()
            break
        } else {
            stream.next()
        }
    }
    return result
}

module.exports = highlight