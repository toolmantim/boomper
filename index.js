const run = require('./lib/run')
const configName = 'boomper.yml'

module.exports = app => {
  app.on('release', async context => {
    await run({ context, configName })
  })

  app.on('push', async context => {
    const configPath = `.github/${configName}`

    if (context.payload.commits.some(commit => (
      commit.added.includes(configPath) ||
      commit.removed.includes(configPath) ||
      commit.modified.includes(configPath)
    ))) {
      await run({ context, configName })
    } else {
      context.log(`Ignoring push that didn't modify ${configPath}`)
    }
  })
}
