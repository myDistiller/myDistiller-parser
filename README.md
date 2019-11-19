# myDestiller Parser

## Usage

```js
const { parse, compile, compileAll, apply } = require('mydistiller-parser')

let variables = compile('test="test"')

console.log(`Regex: ${variables.test}`)

// Alternatively

let syntaxTree = parse('test="test"')

let regex = compileAll(syntaxTree)

console.log(`Complete regex: ${regex}`)

let text = `
test 123
test test1 test2
`

console.log(`Result: ${JSON.stringify(apply(regex, text), null, 4)}`)
```
