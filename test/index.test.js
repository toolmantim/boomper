const nock = require('nock')
const { createRobot } = require('probot')
const { fn } = jest

const { mockError, mockConfig, decodeContent, mockContent } = require('./helpers/mock-responses')
const app = require('../index')

nock.disableNetConnect()

describe('bumper', () => {
  let robot
  let github

  beforeEach(() => {
    robot = createRobot({})
    app(robot)

    github = {
      // Basic mocks, so we can perform `.not.toHaveBeenCalled()` assertions
      repos: {
        getContent: fn(),
        getReleases: fn(),
        updateFile: fn()
      },
      paginate: fn().mockImplementation((promise, fn) => promise.then(fn))
    }

    robot.auth = () => Promise.resolve(github)
  })

  describe('release', () => {
    describe('without a config', () => {
      it('does nothing', async () => {
        github.repos.getContent = fn().mockImplementationOnce(() => mockError(404))
        await robot.receive({ event: 'release', payload: require('./fixtures/release') })
        expect(github.repos.updateFile).not.toHaveBeenCalled()
      })
    })

    describe('with a config', () => {
      describe('with no releases', () => {
        it('does nothing', async () => {
          github.repos.getContent = fn().mockReturnValueOnce(mockConfig('config.yml'))
          github.repos.getReleases = fn().mockReturnValueOnce(Promise.resolve({ data: [] }))
          await robot.receive({ event: 'release', payload: require('./fixtures/release') })
          expect(github.repos.updateFile).not.toHaveBeenCalled()
        })
      })

      describe('with a draft release', () => {
        it('does nothing', async () => {
          github.repos.getContent = fn().mockReturnValueOnce(mockConfig('config.yml'))
          github.repos.getReleases = fn().mockReturnValueOnce(Promise.resolve({
            data: [ require('./fixtures/release-draft').release ]
          }))
          await robot.receive({ event: 'release', payload: require('./fixtures/release') })
          expect(github.repos.updateFile).not.toHaveBeenCalled()
        })
      })

      describe('with a release', () => {
        it('updates the files', async () => {
          // TODO
        })
      })

      describe('with a pre-release', () => {
        it('does nothing', async () => {
          const release = require('./fixtures/release-prerelease').release

          github.repos.getContent = fn().mockReturnValueOnce(mockConfig('config.yml'))
          github.repos.getReleases = fn().mockReturnValueOnce(Promise.resolve({ data: [ release ] }))

          await robot.receive({ event: 'release', payload: require('./fixtures/release-prerelease') })
          expect(github.repos.updateFile).not.toHaveBeenCalled()
        })
      })
    })
  })

  describe('push', () => {
    describe('to a non-config file', () => {
      it('does nothing', async () => {
        github.repos.getContent = fn().mockReturnValueOnce(mockConfig('config.yml'))
        await robot.receive({ event: 'push', payload: require('./fixtures/push-unrelated-change') })
        expect(github.repos.updateFile).not.toHaveBeenCalled()
      })
    })

    describe('to a non-master branch', () => {
      it('does nothing', async () => {
        github.repos.getContent = fn().mockReturnValueOnce(mockConfig('config.yml'))
        await robot.receive({ event: 'push', payload: require('./fixtures/push-non-master-branch') })
        expect(github.repos.updateFile).not.toHaveBeenCalled()
      })

      describe('when configured with the branch', () => {
        it('updates the files', async () => {
          // TODO
        })
      })
    })

    describe('modifying .github/bumper.yml', () => {
      it('updates the files', async () => {
        // TODO
      })
    })
  })
})
