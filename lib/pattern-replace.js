module.exports = ({ pattern, version, content }) => {
  // The pattern arg contains a single sub-group, e.g.
  // 'https://host.com/(.*)/file.zip'
  //
  // But we want to replace the bit in parentheses with the version arg, and
  // leave the rest.
  //
  // To do this  we create a new pattern, containing our own grouping containing
  // the before and after parts as well. e.g.
  // '(https://host.com/)(.*)(/file.zip)'

  const newPattern = pattern.replace(/^(.*)(\(.*\))(.*)$/, '($1)$2($3)')

  return content.replace(new RegExp(newPattern, 'g'), (match, p1, p2, p3) => {
    return `${p1}${version}${p3}`
  })
}
