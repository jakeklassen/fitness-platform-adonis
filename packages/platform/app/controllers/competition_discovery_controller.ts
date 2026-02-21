import {
  CompetitionDiscoveryService,
  type DiscoveryFilters,
} from '#services/competition_discovery_service';
import type { HttpContext } from '@adonisjs/core/http';

export default class CompetitionDiscoveryController {
  /**
   * Display discoverable public competitions
   */
  async index({ auth, request, inertia }: HttpContext) {
    const user = auth.getUserOrFail();

    const search = request.input('search', '');
    const status = request.input('status', '');
    const source = request.input('source', 'all');

    const filters: DiscoveryFilters = {
      search: search || undefined,
      status: status || undefined,
      source: source || 'all',
    };

    const discoveryService = new CompetitionDiscoveryService();
    const competitions = await discoveryService.discoverCompetitions(user.id, filters);

    return inertia.render('competitions/discover', {
      competitions,
      filters: { search, status, source },
    });
  }

  /**
   * Join a public competition
   */
  async join({ auth, params, response, session }: HttpContext) {
    const user = auth.getUserOrFail();
    const discoveryService = new CompetitionDiscoveryService();

    const result = await discoveryService.joinPublicCompetition(params.id, user.id);

    if (result.error) {
      session.flash('error', result.error);
    } else {
      session.flash('success', 'You have joined the competition!');
    }

    return response.redirect().toRoute('competitions.show', { id: params.id });
  }
}
