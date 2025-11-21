import vine from '@vinejs/vine';

export const createCompetitionValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(3).maxLength(255),
    description: vine.string().trim().optional(),
    startDate: vine.date(),
    endDate: vine.date().afterField('startDate'),
    goalType: vine.enum(['total_steps', 'goal_based']),
    goalValue: vine.number().positive().optional(),
    visibility: vine.enum(['private', 'public']).optional(),
  })
);

export const updateCompetitionValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(3).maxLength(255).optional(),
    description: vine.string().trim().optional().nullable(),
    startDate: vine.date().optional(),
    endDate: vine.date().optional(),
    goalType: vine.enum(['total_steps', 'goal_based']).optional(),
    goalValue: vine.number().positive().optional().nullable(),
    status: vine.enum(['draft', 'active', 'ended']).optional(),
  })
);
