const nock = require('nock')
const { Probot, ProbotOctokit } = require('probot')

const { mockConfig, mockContent } = require('./helpers/mock-responses')
const boomper = require('../index')

describe('boomper', () => {
  let probot

  beforeEach(() => {
    nock.disableNetConnect()

    probot = new Probot({
      id: 1,
      githubToken: 'test',
      Octokit: ProbotOctokit.defaults({
        retry: { enabled: false },
        throttle: { enabled: false }
      })
    })

    probot.load(boomper)
  })

  describe('release', () => {
    describe('without a config', () => {
      it('does nothing', async () => {
        const mock = nock('https://api.github.com')
          .get('/repos/toolmantim/boomper-test-project/contents/.github%2Fboomper.yml')
          .reply(404)
          .get('/repos/toolmantim/.github/contents/.github%2Fboomper.yml')
          .reply(404)

        await probot.receive({ name: 'release', payload: require('./fixtures/release') })

        expect(mock.activeMocks()).toStrictEqual([])
      })
    })

    describe('with a config', () => {
      describe('with no releases', () => {
        it('does nothing', async () => {
          const mock = nock('https://api.github.com')
            .get('/repos/toolmantim/boomper-test-project/contents/.github%2Fboomper.yml')
            .reply(200, mockConfig('config.yml'))
            .get('/repos/toolmantim/boomper-test-project/releases')
            .reply(200, [])

          await probot.receive({ name: 'release', payload: require('./fixtures/release') })

          expect(mock.activeMocks()).toStrictEqual([])
        })
      })

      describe('with a draft release', () => {
        it('does nothing', async () => {
          const mock = nock('https://api.github.com')
            .get('/repos/toolmantim/boomper-test-project/contents/.github%2Fboomper.yml')
            .reply(200, mockConfig('config.yml'))
            .get('/repos/toolmantim/boomper-test-project/releases')
            .reply(200, [require('./fixtures/release-draft').release])

          await probot.receive({ name: 'release', payload: require('./fixtures/release') })

          expect(mock.activeMocks()).toStrictEqual([])
        })
      })

      describe('with a release', () => {
        it('updates the files', async () => {
          const release = require('./fixtures/release').release
          const oldRelease = require('./fixtures/release-old-version').release

          const mock = nock('https://api.github.com')
            .get('/repos/toolmantim/boomper-test-project/contents/.github%2Fboomper.yml')
            .reply(200, mockConfig('config.yml'))
            .get('/repos/toolmantim/boomper-test-project/releases')
            .reply(200, [oldRelease, release])
            .get('/repos/toolmantim/boomper-test-project/contents/README.md')
            .reply(200, mockContent(`
# Some project
https://download.com/v0.0.1/file.zip
https://download.com/v1.0.0/file.zip`))
            .put('/repos/toolmantim/boomper-test-project/contents/README.md', (body) => {
              expect(body).toEqual({
                content: 'CiMgU29tZSBwcm9qZWN0Cmh0dHBzOi8vZG93bmxvYWQuY29tL3YxLjAuMi9maWxlLnppcApodHRwczovL2Rvd25sb2FkLmNvbS92MS4wLjIvZmlsZS56aXA=',
                message: 'Bump README.md for v1.0.2 release',
                sha: 'dcef71f84be19369d04d41c2a898b32c900320dc'
              })
              return true
            })
            .reply(201, {})

          await probot.receive({ name: 'release', payload: require('./fixtures/release') })

          expect(mock.activeMocks()).toStrictEqual([])
        })

        describe('with a config file with skipCi', () => {
          it('updates the files', async () => {
            const release = require('./fixtures/release').release
            const oldRelease = require('./fixtures/release-old-version').release

            const mock = nock('https://api.github.com')
              .get('/repos/toolmantim/boomper-test-project/contents/.github%2Fboomper.yml')
              .reply(200, mockConfig('config-with-skip-ci.yml'))
              .get('/repos/toolmantim/boomper-test-project/releases')
              .reply(200, [oldRelease, release])
              .get('/repos/toolmantim/boomper-test-project/contents/README.md')
              .reply(200, mockContent(`
  # Some project
  https://download.com/v0.0.1/file.zip
  https://download.com/v1.0.0/file.zip`))
              .put('/repos/toolmantim/boomper-test-project/contents/README.md', (body) => {
                expect(body).toEqual({
                  content: 'CiAgIyBTb21lIHByb2plY3QKICBodHRwczovL2Rvd25sb2FkLmNvbS92MS4wLjIvZmlsZS56aXAKICBodHRwczovL2Rvd25sb2FkLmNvbS92MS4wLjIvZmlsZS56aXA=',
                  message: 'Bump README.md for v1.0.2 release [skip ci]',
                  sha: '3b54dab859e79dd0f2548039ababb44f33cae4ea'
                })
                return true
              })
              .reply(201, {})

            await probot.receive({ name: 'release', payload: require('./fixtures/release') })

            expect(mock.activeMocks()).toStrictEqual([])
          })
        })
      })

      describe('with an already updated readme', () => {
        it('does nothing', async () => {
          const release = require('./fixtures/release').release

          const mock = nock('https://api.github.com')
            .get('/repos/toolmantim/boomper-test-project/contents/.github%2Fboomper.yml')
            .reply(200, mockConfig('config.yml'))
            .get('/repos/toolmantim/boomper-test-project/releases')
            .reply(200, [release])
            .get('/repos/toolmantim/boomper-test-project/contents/README.md')
            .reply(200, mockContent('# Some project\nhttps://download.com/v1.0.2/file.zip'))

          await probot.receive({ name: 'release', payload: require('./fixtures/release') })

          expect(mock.activeMocks()).toStrictEqual([])
        })
      })

      describe('with a pre-release', () => {
        it('does nothing', async () => {
          const prerelease = require('./fixtures/release-prerelease').release

          const mock = nock('https://api.github.com')
            .get('/repos/toolmantim/boomper-test-project/contents/.github%2Fboomper.yml')
            .reply(200, mockConfig('config.yml'))
            .get('/repos/toolmantim/boomper-test-project/releases')
            .reply(200, [prerelease])

          await probot.receive({ name: 'release', payload: require('./fixtures/release-prerelease') })

          expect(mock.activeMocks()).toStrictEqual([])
        })
      })

      describe('with a config file missing .updates', () => {
        it('does nothing', async () => {
          const mock = nock('https://api.github.com')
            .get('/repos/toolmantim/boomper-test-project/contents/.github%2Fboomper.yml')
            .reply(200, mockConfig('config-no-updates.yml'))

          await probot.receive({ name: 'release', payload: require('./fixtures/release') })

          expect(mock.activeMocks()).toStrictEqual([])
        })
      })

      describe('with a config file missing .updates.path', () => {
        it('does nothing', async () => {
          const mock = nock('https://api.github.com')
            .get('/repos/toolmantim/boomper-test-project/contents/.github%2Fboomper.yml')
            .reply(200, mockConfig('config-updates-no-path.yml'))
            .get('/repos/toolmantim/boomper-test-project/releases')
            .reply(200, [require('./fixtures/release')])

          await probot.receive({ name: 'release', payload: require('./fixtures/release') })

          expect(mock.activeMocks()).toStrictEqual([])
        })
      })

      describe('with a config file missing .updates.pattern', () => {
        it('does nothing', async () => {
          const mock = nock('https://api.github.com')
            .get('/repos/toolmantim/boomper-test-project/contents/.github%2Fboomper.yml')
            .reply(200, mockConfig('config-updates-no-pattern.yml'))
            .get('/repos/toolmantim/boomper-test-project/releases')
            .reply(200, [require('./fixtures/release')])

          await probot.receive({ name: 'release', payload: require('./fixtures/release') })

          expect(mock.activeMocks()).toStrictEqual([])
        })
      })
    })
  })

  describe('push', () => {
    describe('to a non-config file', () => {
      it('does nothing', async () => {
        await probot.receive({ name: 'push', payload: require('./fixtures/push-unrelated-change') })
      })
    })

    describe('to a non-master branch', () => {
      it('does nothing', async () => {
        const mock = nock('https://api.github.com')
          .get('/repos/toolmantim/boomper-test-project/contents/.github%2Fboomper.yml')
          .reply(200, mockConfig('config.yml'))

        await probot.receive({ name: 'push', payload: require('./fixtures/push-non-master-branch') })

        expect(mock.activeMocks()).toStrictEqual([])
      })

      describe('when configured with the branch', () => {
        it('updates the files', async () => {
          const release = require('./fixtures/release').release

          const mock = nock('https://api.github.com')
            .get('/repos/toolmantim/boomper-test-project/contents/.github%2Fboomper.yml')
            .reply(200, mockConfig('config-with-non-master-branch.yml'))
            .get('/repos/toolmantim/boomper-test-project/releases')
            .reply(200, [release])
            .get('/repos/toolmantim/boomper-test-project/contents/README.md')
            .reply(200, mockContent('# Some project\nhttps://download.com/v0.0.1/file.zip'))
            .put('/repos/toolmantim/boomper-test-project/contents/README.md', (body) => {
              expect(body).toEqual({
                message: 'Bump README.md for v1.0.2 release',
                content: 'IyBTb21lIHByb2plY3QKaHR0cHM6Ly9kb3dubG9hZC5jb20vdjEuMC4yL2ZpbGUuemlw',
                sha: '69c1bd14603c5afdb307d3dc332381037cbe4b1b'
              })
              return true
            })
            .reply(201, {})

          await probot.receive({ name: 'push', payload: require('./fixtures/push-non-master-branch') })

          expect(mock.activeMocks()).toStrictEqual([])
        })
      })
    })

    describe('modifying .github/boomper.yml', () => {
      it('updates the files', async () => {
        const release = require('./fixtures/release').release

        const mock = nock('https://api.github.com')
          .get('/repos/toolmantim/boomper-test-project/contents/.github%2Fboomper.yml')
          .reply(200, mockConfig('config.yml'))
          .get('/repos/toolmantim/boomper-test-project/releases')
          .reply(200, [release])
          .get('/repos/toolmantim/boomper-test-project/contents/README.md')
          .reply(200, mockContent('# Some project\nhttps://download.com/v0.0.1/file.zip'))
          .put('/repos/toolmantim/boomper-test-project/contents/README.md', (body) => {
            expect(body).toEqual({
              message: 'Bump README.md for v1.0.2 release',
              content: 'IyBTb21lIHByb2plY3QKaHR0cHM6Ly9kb3dubG9hZC5jb20vdjEuMC4yL2ZpbGUuemlw',
              sha: '69c1bd14603c5afdb307d3dc332381037cbe4b1b'
            })
            return true
          })
          .reply(201, {})

        await probot.receive({ name: 'push', payload: require('./fixtures/push-config-change') })

        expect(mock.activeMocks()).toStrictEqual([])
      })
    })
  })

  afterEach(() => {
    nock.cleanAll()
    nock.enableNetConnect()
  })
})
