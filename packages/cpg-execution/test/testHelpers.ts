import fs from 'fs'
import path from 'path'

export const fixture = <T>(
  filename: string,
  fixturePath: string = path.join(__dirname, 'fixtures', 'ExampleIG', 'output')
): T => {
  let fixtureFilename = path.join(fixturePath, filename)

  if (!fixtureFilename.endsWith('json')) {
    fixtureFilename += '.json'
  }

  return JSON.parse(fs.readFileSync(fixtureFilename).toString()) as T
}
