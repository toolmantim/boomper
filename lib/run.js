const getConfig = require('probot-config')
const compareVersions = require('compare-versions')
const { decodeContent, encodeContent } = require('./base46')
const patternReplace = require('./pattern-replace')

const runUpdate = async ({ app, context, path, pattern, branch, release, skipCi }) => {
  const version = release.tag_name

  if (!path || !pattern) {
    app.log(`No valid config found`)
    return
  }

  const contentResponse = await context.github.repos.getContent(context.repo({ path }))
  const content = decodeContent(contentResponse.data.content)
  const updatedContent = patternReplace({ content, pattern, version })

  if (content === updatedContent) {
    app.log(`No change in content`)
    return
  }

  let message = `Bump ${path} for ${version} release`
  if (skipCi) {
    message += ` [skip ci]`
  }

  await context.github.repos.updateFile(context.repo({
    path,
    message,
    content: encodeContent(updatedContent),
    sha: contentResponse.data.sha,
    branch: branch
  }))

  app.log(`Updated ${path}`)
}

module.exports = async ({ app, context, configName }) => {
  const config = await getConfig(context, configName) || {}
  const skipCi = config['skip-ci']
  let { updates, branches } = config

  if (!branches) {
    branches = ['master']
  }

  if (!updates) {
    app.log(`No valid config found`)
    return
  }

  if (context.event === 'push') {
    const branch = context.payload.ref.replace(/^refs\/heads\//, '')
    if (branches.indexOf(branch) === -1) {
      app.log(`Ignoring push. ${branch} is not one of: ${branches.join(', ')}`)
      return
    }
  }

  let releases = await context.github.paginate(
    context.github.repos.getReleases(context.repo()),
    res => res.data
  )

  releases = releases
    .filter(r => !r.draft)
    .sort((r1, r2) => compareVersions(r2.tag_name, r1.tag_name))

  if (releases.length === 0) {
    app.log(`No releases found`)
    return
  }

  const release = releases.filter(r => !r.prerelease)[0]

  if (release) {
    return Promise.all(updates.map((update) => runUpdate({
      app,
      context,
      release,
      skipCi,
      ...update
    })))
  }
}
