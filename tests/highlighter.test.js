const { highlight } = require('../index.js')

test('string highlighting', () => {
    expect(highlight(`test="123"`)).toEqual([{ type: "variable", visible: true, line: 1, start: 1, end: 4 }, { type: "equals", line: 1, start: 5, end: 5 }, { type: "string", start: 6, line: 1, end: 10 }]);
})

test('non closing string', () => {
    expect(highlight(`test="test`)).toEqual([{ type: "variable", visible: true, line: 1, start: 1, end: 4 }, { type: "equals", line: 1, start: 5, end: 5 }, { type: "string", start: 6, line: 1, end: 10 }]);
})

test('invisible variable', () => {
    expect(highlight(`!test="123"`)).toEqual([{ type: "variable", visible: false, line: 1, start: 1, end: 5 }, { type: "equals", line: 1, start: 6, end: 6 }, { type: "string", start: 7, line: 1, end: 11 }]);
})