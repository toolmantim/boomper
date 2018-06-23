const getConfig = require('probot-config')
const compareVersions = require('compare-versions')

const runUpdate = async ({ robot, context, path, pattern, branch: branchArg, release }) => {
  const branch = branchArg || 'master'

  if (!path || !pattern || !branch) {
    robot.log(`No valid config found`)
    return
  }

  const content = await context.github.repos.getContent(context.repo({ path }))

  robot.log(`Updating ${path}`, { content })

  // await context.github.repos.updateFile({
  //   owner,
  //   repo,
  //   path,
  //   message: `Updated ${path} formula`,
  //   content: Buffer.from(renderedTemplate).toString('base64'),
  //   sha: ().data.sha
  // })

  // robot.log(`Updated ${owner}/${repo}/${path}`)
}

module.exports = async ({ robot, context, configName }) => {
  const config = await getConfig(context, configName) || {}
  let { updates, branches } = config

  if (!branches) {
    branches = ['master']
  }

  if (!updates) {
    robot.log(`No valid config found`)
    return
  }

  if (context.event === 'push') {
    const branch = context.payload.ref.replace(/^refs\/heads\//, '')
    if (branches.indexOf(branch) === -1) {
      robot.log(`Ignoring push. ${branch} is not one of: ${branches.join(', ')}`)
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
    robot.log(`No releases found`)
    return
  }

  const release = releases.filter(r => !r.prerelease)[0]

  if (release) {
    return Promise.all(updates.map((update) => runUpdate({
      robot,
      context,
      release,
      ...update
    })))
  }
}
