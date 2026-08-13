import nx from "@nx/eslint-plugin";

export default [
    ...nx.configs["flat/base"],
    ...nx.configs["flat/typescript"],
    ...nx.configs["flat/javascript"],
    {
        ignores: [
            "**/dist",
            "**/out-tsc"
        ]
    },
    {
        files: [
            "**/*.ts",
            "**/*.tsx",
            "**/*.js",
            "**/*.jsx"
        ],
        rules: {
            "@nx/enforce-module-boundaries": [
                "error",
                {
                    enforceBuildableLibDependency: true,
                    allow: [
                        "^.*/eslint(\\.base)?\\.config\\.[cm]?[jt]s$"
                    ],
                  depConstraints: [
                    {
                      sourceTag: "domain:employees",
                      onlyDependOnLibsWithTags: ["domain:employees", "domain:shared"]
                    },
                    {
                      sourceTag: "domain:leave",
                      onlyDependOnLibsWithTags: ["domain:leave", "domain:shared"]
                    },
                    {
                      sourceTag: "domain:time",
                      onlyDependOnLibsWithTags: ["domain:time", "domain:shared"]
                    },
                    {
                      sourceTag: "type:feature",
                      onlyDependOnLibsWithTags: ["type:feature", "type:data-access", "type:ui", "type:domain-api"]
                    },
                    {
                      sourceTag: "type:ui",
                      onlyDependOnLibsWithTags: ["type:ui"]
                    },
                    {
                      sourceTag: "type:data-access",
                      onlyDependOnLibsWithTags: ["type:data-access", "type:ui"]
                    }
                  ]
                }
            ]
        }
    },
    {
        files: [
            "**/*.ts",
            "**/*.tsx",
            "**/*.cts",
            "**/*.mts",
            "**/*.js",
            "**/*.jsx",
            "**/*.cjs",
            "**/*.mjs"
        ],
        // Override or add rules here
        rules: {}
    }
];
