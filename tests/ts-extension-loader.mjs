export async function resolve(specifier, context, defaultResolve) {
  try {
    return await defaultResolve(specifier, context, defaultResolve);
  } catch (error) {
    const needsTsFallback =
      typeof specifier === "string" &&
      (specifier.startsWith("./") || specifier.startsWith("../")) &&
      !/\.[a-z0-9]+$/i.test(specifier);

    if (needsTsFallback) {
      return defaultResolve(`${specifier}.ts`, context, defaultResolve);
    }

    throw error;
  }
}
