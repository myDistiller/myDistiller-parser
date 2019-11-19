const { parse, compile } = require('../index.js')

test('escape \' in regexes', () => {
    expect(compile(`test='test\\'123'`)).toEqual({ test: '(?<test_0>test\'123)' });
})

test('escape " in strings', () => {
    expect(compile(`test="test\\"123"`)).toEqual({ test: '(?<test_0>test\"123)' });
})

test('define multiple variables', () => {
    expect(compile(`test,test1="test"`)).toEqual({ test: '(?<test_0>test)', test1: '(?<test1_1>test)' });
})

test('wrong variables', () => {
    expect(() => parse(`test,1test1="test"`)).toThrow();
    expect(() => parse(`_test="test"`)).toThrow();
    expect(() => parse(`test_="test"`)).toThrow();
    expect(() => parse(`te_st="test"`)).toThrow();
})

test('non closing string', () => {
    expect(() => parse(`test="test`)).toThrow();
})

test('non closing regex', () => {
    expect(() => parse(`test='test`)).toThrow();
})

test('undefined variable', () => {
    expect(() => compile(`test=test1`)).toThrow();
})

test('missing left-hand side', () => {
    expect(() => compile(`test=."test"`)).toThrow();
})

test('missing right-hand side', () => {
    expect(() => compile(`test="test".`)).toThrow();
})

test('invalid regex', () => {
    expect(() => compile(`test='('`)).toThrow();
})

test('sanity check', () => {
    const str = `
numeric,numerics='\\d+([-.\\,]\\d+)*'
decimal,decimales='(\\d{1,3}[.,]?)+-?;;\\d+[,.]\\d+'
WORD,WORDS='\\b\\p{Lu}+([-\\p{Lu}\\']+)?\\b'
Word,Words='\\b\\p{Lu}[\\p{Ll}\\']*(-?\\p{Lu}[\\p{Ll}\\']*)?\\b'
word,words='\\b\\p{L}*(-?\\p{L}*)?\\b'
year,years='[1-2]\\d{3}(-\\d{1,2})?'
date,dates='\\d{4}-\\d{1,2}-\\d{1,2};;\\d{1,2}[/.]\\d{1,2}[./]\\d{4};;\\d{4}-\\d{1,2}'
timeFrom="from".year:year
timeTo="to".year:year
timeAfter="after".words.year:year
lifetime,lifetimes="(".date:birthdate.date:death date.")"
# title,title=phrase:german."(".phrase:english.")"
`
    expect(() => compile(str)).not.toThrow();
})

test('only one letter', () => {
    expect(parse(`a`)).toEqual([{ type: "assignment", variables: [{ type: "variable", line: 1, start: 1, visible: true, value: "a", end: 2 }], value: [] }]);
})

test('invisible variable', () => {
    expect(parse(`!test="123"`)).toEqual([{ type: "assignment", variables: [{ type: "variable", line: 1, start: 1, visible: false, value: "test", end: 6 }], value: [{ type: "string", line: 1, start: 7, value: "123", end: 11 }] }]);
    expect(compile(`
    !test="test"
    !test1="test1"
    test2=test.test1
    test3=test2
    `)).toEqual({ test: "(?:test)", test1: "(?:test1)", test2: "(?<test2_0>(?:(?:test)\\s*\\b(?:test1)))", test3: "(?<test3_2>(?<test2_1>(?:(?:test)\\s*\\b(?:test1))))" });
})


test('define multiple invisible variables', () => {
    expect(compile(`!test,!test1="test"`)).toEqual({ test: '(?:test)', test1: '(?:test)' });
})

test('define invisible and visible variables', () => {
    expect(compile(`!test,test1="test"`)).toEqual({ test: '(?:test)', test1: '(?<test1_0>test)' });
})

test('valid regex', () => {
    expect(() => new RegExp(compile(`test1='123'\ntest2='456'\ntest=test1.test2`))).not.toThrow();
})

test('duplicate variable', () => {
    expect(() => new RegExp(compile(`test='123'\ntest='456'`))).toThrow();
})

test('no input', () => {
    expect(() => compile()).toThrow();
})

test('no variable value', () => {
    expect(() => new RegExp(compile(`test=`))).toThrow();
    expect(() => new RegExp(compile(`test`))).toThrow();
})