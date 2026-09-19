import next from "eslint-config-next";

const config = [
  ...next,
  {
    ignores: [".next/**", "out/**", "node_modules/**", "next-env.d.ts"],
  },
  {
    // react-three-fiber's render loop (useFrame) runs outside React's render
    // and mutates three.js objects by design — the React Compiler's
    // immutability and purity rules don't model it, so they are off inside
    // the 3D layer only. Everything else keeps the default Next.js rules.
    files: ["src/components/three/**/*.tsx"],
    rules: {
      "react-hooks/immutability": "off",
      "react-hooks/purity": "off",
      "react-hooks/refs": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/preserve-manual-memoization": "off",
    },
  },
];

export default config;
