/**
 * Tipos mínimos dos payloads de webhook do GitHub usados pelo MVP.
 * Não é o schema completo do GitHub — apenas os campos que consumimos.
 */

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
}

export interface PullRequestEvent {
  action: "opened" | "closed" | "reopened" | string;
  pull_request: GitHubPullRequest;
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
  | { name: "workflow_run"; payload: WorkflowRunEvent }
  | { name: "issues"; payload: IssuesEvent };
