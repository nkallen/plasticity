module.exports = {
    "packagerConfig": {},
    "hooks": {
        // preMake: async (...args) => {
        //     console.log("pre", args);
        // },
        // postMake: async (...args) => {
        //     console.log("post", args);
        // }
    },
    "makers": [
        {
            "name": "@electron-forge/maker-squirrel",
            "config": {
                "name": "plasticity"
            }
        },
        {
            "name": "@electron-forge/maker-zip",
            "platforms": [
                "darwin"
            ]
        },
        {
            "name": "@electron-forge/maker-deb",
            "config": {}
        },
        {
            "name": "@electron-forge/maker-rpm",
            "config": {}
        }
    ],
    "publishers": [
        {
            "name": "@electron-forge/publisher-github",
            "config": {
                "repository": {
                    "owner": "nkallen",
                    "name": "plasticity"
                },
                "prerelease": true,
                "draft": false
            }
        }
    ],
    "plugins": [
        [
            "@electron-forge/plugin-webpack",
            {
                "devContentSecurityPolicy": "default-src 'self' 'unsafe-inline' data:; script-src 'self' 'unsafe-eval' 'unsafe-inline' data:",
                "mainConfig": "./webpack.main.config.js",
                "devServer": {
                    "liveReload": false,
                    "hot": false
                },
                "renderer": {
                    "nodeIntegration": true,
                    "config": "./webpack.renderer.config.js",
                    "entryPoints": [
                        {
                            "html": "./src/index.html",
                            "js": "./src/renderer.ts",
                            "name": "main_window"
                        }
                    ]
                }
            }
        ]
    ]
}