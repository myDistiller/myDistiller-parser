const highlight = require('./highlighter.js')
const { parse } = require('./parser.js')
const { compile, compileAll } = require('./compiler.js')
const apply = require('./apply.js')
module.exports = { highlight, parse, compile, compileAll, apply }
