export async function resolve(specifier, context, defaultResolve) {
  try {
    return await defaultResolve(specifier, context, defaultResolve);
  } catch (error) {
    const relativeSpecifier =
      typeof specifier === "string" &&
      (specifier.startsWith("./") || specifier.startsWith("../"));

    if (relativeSpecifier && specifier.endsWith(".js")) {
      return defaultResolve(specifier.replace(/\.js$/i, ".ts"), context, defaultResolve);
    }

    const needsTsFallback =
      typeof specifier === "string" &&
      relativeSpecifier &&
      !/\.[a-z0-9]+$/i.test(specifier);

    if (needsTsFallback) {
      return defaultResolve(`${specifier}.ts`, context, defaultResolve);
    }

    throw error;
  }
}
