export interface GitHubUser {
  login: string;
  html_url: string;
  avatar_url: string;
}

export interface GitHubRepository {
  full_name: string;
  html_url: string;
}

export interface GitHubPullRequest {
  number: number;
  title: string;
  html_url: string;
  user: GitHubUser;
  merged: boolean;
  draft: boolean;
  base: { ref: string };
  head: { ref: string };
  requested_reviewers?: GitHubUser[];
}

export interface PullRequestEvent {
  action:
    | "opened"
    | "closed"
    | "reopened"
    | "ready_for_review"
    | "review_requested"
    | string;
  pull_request: GitHubPullRequest;
  repository: GitHubRepository;
  sender: GitHubUser;
  /** Presente quando action === "review_requested" e o reviewer é uma pessoa. */
  requested_reviewer?: GitHubUser;
  /** Presente quando action === "review_requested" e o reviewer é um time. */
  requested_team?: { name: string };
}

/** Comentário genérico (usado em issue_comment e pull_request_review_comment). */
export interface GitHubComment {
  body: string;
  html_url: string;
  user: GitHubUser;
}

/**
 * Evento `issue_comment`: dispara tanto para comentários em Issues quanto em Pull Requests
 * (no GitHub, toda PR também é uma Issue). Quando `issue.pull_request` existe, o comentário
 * é numa Pull Request.
 */
export interface IssueCommentEvent {
  action: "created" | "edited" | "deleted" | string;
  issue: GitHubIssue;
  comment: GitHubComment;
  repository: GitHubRepository;
}

/** Evento `pull_request_review_comment`: comentário numa linha específica do diff da PR. */
export interface PullRequestReviewCommentEvent {
  action: "created" | "edited" | "deleted" | string;
  comment: GitHubComment;
  pull_request: GitHubPullRequest;
  repository: GitHubRepository;
}

/**
 * Evento `deployment_status`: usado pela API de Deployments do GitHub. Serviços como
 * Vercel, Railway e Render (ou um step do GitHub Actions) podem reportar deploys por aqui.
 */
export interface DeploymentStatusEvent {
  action: "created" | string;
  deployment_status: {
    state:
      | "pending"
      | "queued"
      | "in_progress"
      | "success"
      | "failure"
      | "error"
      | "inactive"
      | string;
    description?: string;
    environment: string;
    target_url?: string;
    log_url?: string;
  };
  deployment: {
    sha: string;
    ref: string;
    environment: string;
    description?: string | null;
    task?: string;
  };
  repository: GitHubRepository;
  sender: GitHubUser;
}

export interface PullRequestReviewEvent {
  action: "submitted" | "edited" | "dismissed" | string;
  review: {
    state: "approved" | "changes_requested" | "commented" | string;
    html_url: string;
    user: GitHubUser;
  };
  pull_request: GitHubPullRequest;
  repository: GitHubRepository;
}

export interface WorkflowRunEvent {
  action: "requested" | "in_progress" | "completed" | string;
  workflow_run: {
    name: string;
    html_url: string;
    conclusion: "success" | "failure" | "cancelled" | "skipped" | null;
    status: "queued" | "in_progress" | "completed" | string;
    head_branch: string;
    run_number: number;
  };
  repository: GitHubRepository;
  sender: GitHubUser;
}

export interface GitHubIssue {
  number: number;
  title: string;
  html_url: string;
  user: GitHubUser;
  assignee?: GitHubUser | null;
  assignees?: GitHubUser[];
  /** Presente quando a "issue" do payload é, na verdade, uma Pull Request. */
  pull_request?: { html_url: string };
}

export interface IssuesEvent {
  action: "opened" | "closed" | "reopened" | string;
  issue: GitHubIssue;
  repository: GitHubRepository;
  sender: GitHubUser;
}

export type GitHubWebhookEvent =
  | { name: "pull_request"; payload: PullRequestEvent }
  | { name: "pull_request_review"; payload: PullRequestReviewEvent }
  | { name: "pull_request_review_comment"; payload: PullRequestReviewCommentEvent }
  | { name: "issue_comment"; payload: IssueCommentEvent }
  | { name: "workflow_run"; payload: WorkflowRunEvent }
  | { name: "deployment_status"; payload: DeploymentStatusEvent }
  | { name: "issues"; payload: IssuesEvent };
