const crypto = require('crypto')
const fs = require('fs')

const mockError = (code) => {
  const err = new Error('Not found')
  err.code = code
  throw err
}

const encodeContent = (content) => {
  return Buffer.from(content).toString('base64')
}

const decodeContent = (content) => {
  return Buffer.from(content, 'base64').toString('ascii')
}

const mockContent = (content) => {
  return Promise.resolve({
    data: {
      content: Buffer.from(content).toString('base64'),
      sha: crypto.createHash('sha1').update(content).digest('hex')
    }
  })
}

const mockConfig = (yamlFilePath) => {
  return mockContent(fs.readFileSync(`${__dirname}/../fixtures/${yamlFilePath}`))
}

module.exports = {
  mockError,
  encodeContent,
  decodeContent,
  mockContent,
  mockConfig
}
