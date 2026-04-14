const core = require('@actions/core');
const github = require('@actions/github');

const COMMENT_MARKER = '<!-- ai-code-review -->';
const MAX_RESPONSE_SIZE = 1024 * 1024;
const REQUEST_TIMEOUT_MS = 300_000;

async function getDiff(octokit, owner, repo, pull_number) {
  const files = [];
  let page = 1;
  while (true) {
    const { data } = await octokit.rest.pulls.listFiles({
      owner,
      repo,
      pull_number,
      per_page: 100,
      page,
    });
    files.push(...data);
    if (data.length < 100) break;
    page++;
  }

  return files
    .filter(f => f.patch)
    .map(f => `### ${f.filename} (${f.status})\n\`\`\`diff\n${f.patch}\n\`\`\``)
    .join('\n\n');
}

async function reviewWithAI(apiUrl, apiKey, model, systemPrompt, diff) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response;
  try {
    response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Please review this pull request:\n\n${diff}` },
        ],
      }),
      signal: controller.signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('API request timed out.');
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API error ${response.status}: ${error.slice(0, 200)}`);
  }

  const text = await response.text();
  if (text.length > MAX_RESPONSE_SIZE) {
    throw new Error('API response exceeded size limit.');
  }

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('API returned invalid JSON.');
  }

  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('API returned an empty response.');
  }
  return content;
}

async function run() {
  try {
    const apiKey = core.getInput('API_KEY', { required: true });
    core.setSecret(apiKey);
    const apiBaseUrl = core.getInput('API_BASE_URL');
    const model = core.getInput('MODEL');
    const systemPrompt = core.getInput('SYSTEM_PROMPT');
    const reviewerName = core.getInput('REVIEWER_NAME');
    const token = core.getInput('GITHUB_TOKEN');
    core.setSecret(token);

    const cleanBase = apiBaseUrl.replace(/\/+$/, '');
    if (cleanBase.endsWith('/chat/completions')) {
      core.warning("API_BASE_URL appears to already contain '/chat/completions'. This path is appended automatically. Did you mean to use just the base URL?");
    }
    const apiUrl = cleanBase + '/chat/completions';

    if (!/^https?:\/\//i.test(apiUrl)) {
      core.setFailed('API_BASE_URL must be a valid HTTP(S) URL.');
      return;
    }

    const octokit = github.getOctokit(token);
    const { context } = github;

    if (context.eventName !== 'pull_request') {
      core.setFailed('This action only works on pull_request events.');
      return;
    }

    const { owner, repo } = context.repo;
    const pull_number = context.payload.pull_request.number;

    core.info(`Reviewing PR #${pull_number} with model ${model} via ${apiUrl}...`);

    const diff = await getDiff(octokit, owner, repo, pull_number);

    if (!diff) {
      core.info('No diff found — skipping review.');
      return;
    }

    const review = await reviewWithAI(apiUrl, apiKey, model, systemPrompt, diff);
    const body = `## ${reviewerName}\n\n${review}\n\n${COMMENT_MARKER}`;

    const { data: comments } = await octokit.rest.issues.listComments({
      owner,
      repo,
      issue_number: pull_number,
    });

    const existing = comments.find(c => c.body?.includes(COMMENT_MARKER));

    if (existing) {
      await octokit.rest.issues.updateComment({
        owner,
        repo,
        comment_id: existing.id,
        body,
      });
    } else {
      await octokit.rest.issues.createComment({
        owner,
        repo,
        issue_number: pull_number,
        body,
      });
    }

    core.info('Code review posted successfully.');
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
