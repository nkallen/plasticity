local Pipeline(name, image) = {
  kind: "pipeline",
  type: "kubernetes",
  name: name,
  steps: [
    {
      name: "test",
      image: image,
      commands: [
        "npm set registry $ARTIFACTORY_AUTH",
        "npm test"
        "cat $HOME/.nprc"
      ]
    },
    {
      name: "test",
      image: image,
      commands: [
        "npm install",
        "npm test"
      ]
    }
  ]
};




[
  Pipeline("node6", "node:6")
]