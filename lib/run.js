const compareVersions = require('compare-versions')
const { decodeContent, encodeContent } = require('./base46')
const patternReplace = require('./pattern-replace')

const runUpdate = async ({ context, path, pattern, branch, release }) => {
  const version = release.tag_name

  if (!path || !pattern) {
    context.log.info('No valid config found')
    return
  }

  const contentResponse = await context.github.repos.getContent(context.repo({ path }))
  const content = decodeContent(contentResponse.data.content)
  const updatedContent = patternReplace({ content, pattern, version })

  if (content === updatedContent) {
    context.log.info('No change in content')
    return
  }

  await context.github.repos.createOrUpdateFileContents(context.repo({
    path,
    message: `Bump ${path} for ${version} release`,
    content: encodeContent(updatedContent),
    sha: contentResponse.data.sha,
    branch: branch
  }))

  context.log(`Updated ${path}`)
}

module.exports = async ({ context, configName }) => {
  const config = await context.config(configName) || {}
  let { updates, branches } = config

  if (!branches) {
    branches = ['master']
  }

  if (!updates) {
    context.log.info('No valid config found')
    return
  }

  if (context.event === 'push') {
    const branch = context.payload.ref.replace(/^refs\/heads\//, '')
    if (branches.indexOf(branch) === -1) {
      context.log.info(`Ignoring push. ${branch} is not one of: ${branches.join(', ')}`)
      return
    }
  }

  let releases = await context.github.paginate(
    context.github.repos.listReleases,
    context.repo(),
    res => res.data
  )

  releases = releases
    .filter(r => !r.draft)
    .sort((r1, r2) => compareVersions(r2.tag_name, r1.tag_name))

  if (releases.length === 0) {
    context.log.info('No releases found')
    return
  }

  const release = releases.filter(r => !r.prerelease)[0]

  if (release) {
    return Promise.all(updates.map((update) => runUpdate({
      context,
      release,
      ...update
    })))
  }
}
