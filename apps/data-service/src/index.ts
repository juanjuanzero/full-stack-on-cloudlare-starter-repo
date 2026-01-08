import { WorkerEntrypoint } from 'cloudflare:workers';
import { App } from './hono/app';
import { initDatabase } from '@repo/data-ops/database';
import { QueueMessageSchema } from '@repo/data-ops/zod-schema/queue';
import { handleLinkClick } from './queue-handlers/link-clicks';
export { DestinationEvaluationWorkflow } from './workflows/destination-evaluation-workflow';
export { EvaluationScheduler } from '@/durable-objects/evaluation-scheduler';

export default class DataService extends WorkerEntrypoint<Env> {
	constructor(ctx: ExecutionContext, env: Env) {
		initDatabase(env.DB);
		super(ctx, env);
	}

	fetch(request: Request) {
		return App.fetch(request, this.env, this.ctx);
	}
	async queue(batch: MessageBatch<unknown>) {
		for (const message of batch.messages) {
			const parsedEvent = QueueMessageSchema.safeParse(message.body);
			if (parsedEvent.success) {
				if (parsedEvent.data.type === 'LINK_CLICK') {
					await handleLinkClick(this.env, parsedEvent.data);
				}
			} else {
				console.error('Failed to parse queue message:', parsedEvent.error);
			}
		}
	}
}
