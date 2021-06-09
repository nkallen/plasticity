{
    "targets": [
        {
            "target_name": "c3d",
            "cflags!": ["-fno-exceptions"],
            "cflags_cc!": ["-fno-exceptions"],
            "sources": [
                "./lib/c3d/index.cc",
                "./lib/c3d/src/FaceAddon.cc",
                "./lib/c3d/src/SpaceItemAddon.cc",
                "./lib/c3d/src/SpaceInstanceAddon.cc",
                "./lib/c3d/src/PlaneItemAddon.cc",
                "./lib/c3d/src/Error.cc",
                "./lib/c3d/src/MeshAddon.cc",
                <%_ for (c of classes) if (!c.ignore) { _%>
                    "./lib/c3d/src/<%- c.cppClassName %>.cc",
                <%_ } _%>
            ],
            "include_dirs": [
                "<!@(node -p \"require('node-addon-api').include\")",
                '<(module_root_dir)/vendor/c3d/Include',
                '<(module_root_dir)/include'
            ],
            "conditions": [
                ['OS=="mac"',
                    {
                        'link_settings': {
                            'library_dirs': ['<(module_root_dir)/vendor/c3d/Debug'],
                            'libraries': [
                                'libc3d.dylib',
                            ]
                        },
                        "copies": [
                            {
                                "destination": "<(module_root_dir)/build/Release/",
                                "files": ["<(module_root_dir)/vendor/c3d/Debug/libc3d.dylib"]
                            }
                        ]
                    }
                 ],
                ['OS=="win"',
                    {
                        'link_settings': {
                            'library_dirs': ['<(module_root_dir)/vendor/c3d/Debug'],
                            'libraries': [
                                'c3d.lib',
                            ],
                            "copies": [
                                {
                                    "destination": "<(module_root_dir)/build/Release/",
                                    "files": ["<(module_root_dir)/vendor/c3d/Debug/c3d.dll"]
                                }
                            ]
                        }
                    }
                 ]
            ],
            'xcode_settings': {
                'OTHER_LDFLAGS': [
                    '-Wl,-rpath,\'@loader_path\''
                ]
            },
            'defines': ['NAPI_DISABLE_CPP_EXCEPTIONS'],
        }
    ],
    'xcode_settings': {
        'CLANG_CXX_LANGUAGE_STANDARD': 'c++11',
        'MACOSX_DEPLOYMENT_TARGET': '10.9',
        'GCC_ENABLE_CPP_EXCEPTIONS': 'YES',
        'GCC_ENABLE_CPP_RTTI': 'YES',
        'OTHER_CPLUSPLUSFLAGS': [
            '-fexceptions',
            '-Wno-everything',
            '-O3',
            '-frtti'
        ],
        'CODE_SIGN_IDENTITY': 'socialmediamaster9000@gmail.com'
    },
}
