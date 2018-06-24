const patternReplace = require('../lib/pattern-replace')

describe('patternReplace', () => {
  it('replaces versions in stuff', () => {
    const content = `
      # bumper-test-project

      steps:
        - plugins:
            bumper#v1.0.0: ~
    `

    expect(patternReplace({ content, version: 'v2.0.0', pattern: 'bumper#(.*):' })).toEqual(`
      # bumper-test-project

      steps:
        - plugins:
            bumper#v2.0.0: ~
    `)
  })
})
