import type { AIGenerateTextParams, AIProviders, AIStreamTextParams } from './aiProvidersConfig'

export const generateTextHandlerMap: Record<
  AIProviders,
  {
    generateText: (params: AIGenerateTextParams) => Promise<string>
    streamText: (params: AIStreamTextParams) => Promise<any>
  }
> = {
  deepseek: {
    generateText: async (params: AIGenerateTextParams) => {
      const [{ createDeepSeek }, { generateText }] = await Promise.all([
        import('@ai-sdk/deepseek'),
        import('ai'),
      ])
      const deepseek = createDeepSeek({
        baseURL: params.url || undefined,
        apiKey: params.apiKey,
        headers: params.headers,
      })

      const { text } = await generateText({
        ...params,
        model: deepseek(params.model),
      })

      return text
    },
    streamText: async (params: AIStreamTextParams) => {
      const [{ createDeepSeek }, { streamText }] = await Promise.all([
        import('@ai-sdk/deepseek'),
        import('ai'),
      ])
      const deepseek = createDeepSeek({
        baseURL: params.url || undefined,
        apiKey: params.apiKey,
        headers: params.headers,
      })

      const result = await streamText({
        ...params,
        model: deepseek(params.model),
      })

      return result
    },
  },
  openai: {
    generateText: async (params: AIGenerateTextParams) => {
      const [{ createOpenAI }, { generateText }] = await Promise.all([
        import('@ai-sdk/openai'),
        import('ai'),
      ])
      const openai = createOpenAI({
        baseURL: params.url || undefined,
        apiKey: params.apiKey,
        headers: params.headers,
      })

      const { text } = await generateText({
        ...params,
        model: openai(params.model),
      })

      return text
    },
    streamText: async (params: AIStreamTextParams) => {
      const [{ createOpenAI }, { streamText }] = await Promise.all([
        import('@ai-sdk/openai'),
        import('ai'),
      ])
      const openai = createOpenAI({
        baseURL: params.url || undefined,
        apiKey: params.apiKey,
        headers: params.headers,
      })

      const result = await streamText({
        ...params,
        model: openai(params.model),
      })

      return result
    },
  },
  ollama: {
    generateText: async (params: AIGenerateTextParams) => {
      const [{ createOllama }, { generateText }] = await Promise.all([
        import('ollama-ai-provider-v2'),
        import('ai'),
      ])
      const ollama = createOllama({
        baseURL: params.url || undefined,
        headers: params.headers,
      })

      const { text } = await generateText({
        ...params,
        model: ollama(params.model),
      })

      return text
    },
    streamText: async (params: AIStreamTextParams) => {
      const [{ createOllama }, { streamText }] = await Promise.all([
        import('ollama-ai-provider-v2'),
        import('ai'),
      ])
      const ollama = createOllama({
        baseURL: params.url || undefined,
        headers: params.headers,
      })

      const result = await streamText({
        ...params,
        model: ollama(params.model),
      })

      return result
    },
  },
  google: {
    generateText: async (params: AIGenerateTextParams) => {
      const [{ createGoogleGenerativeAI }, { generateText }] = await Promise.all([
        import('@ai-sdk/google'),
        import('ai'),
      ])
      const google = createGoogleGenerativeAI({
        baseURL: params.url || undefined,
        apiKey: params.apiKey,
        headers: params.headers,
      })

      const { text } = await generateText({
        ...params,
        model: google(params.model),
      })

      return text
    },
    streamText: async (params: AIStreamTextParams) => {
      const [{ createGoogleGenerativeAI }, { streamText }] = await Promise.all([
        import('@ai-sdk/google'),
        import('ai'),
      ])
      const google = createGoogleGenerativeAI({
        baseURL: params.url || undefined,
        apiKey: params.apiKey,
        headers: params.headers,
      })

      const result = await streamText({
        ...params,
        model: google(params.model),
      })

      return result
    },
  },
}
