class ParseError extends Error {
    constructor(message, line, col) {
        super(`${message} (line ${line}, column ${col})`)
        this.line = line
        this.col = col
        this.errorMessage = message
    }
}

class CompileError extends Error {
    constructor(message) {
        super(message)
        this.errorMessage = message
    }
}

module.exports = { ParseError, CompileError }