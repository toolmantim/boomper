const patternReplace = require('../lib/pattern-replace')

describe('patternReplace', () => {
  it('replaces versions in stuff', () => {
    const content = `
      # boomper-test-project

      steps:
        - plugins:
            boomper#v1.0.0: ~
    `

    expect(patternReplace({ content, version: 'v2.0.0', pattern: 'boomper#(.*):' })).toEqual(`
      # boomper-test-project

      steps:
        - plugins:
            boomper#v2.0.0: ~
    `)
  })
})
