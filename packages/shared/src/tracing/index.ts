import { NodeSDK } from '@opentelemetry/sdk-node'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'

export interface TracingOpts {
  serviceName: string
  autoInstrument?: boolean
}

export function initTracing(opts: TracingOpts): NodeSDK {
  const sdk = new NodeSDK({
    serviceName: opts.serviceName,
    traceExporter: new OTLPTraceExporter({
      url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? 'http://localhost:4318/v1/traces',
    }),
    instrumentations: opts.autoInstrument ? [getNodeAutoInstrumentations()] : undefined,
  })
  sdk.start()
  return sdk
}
