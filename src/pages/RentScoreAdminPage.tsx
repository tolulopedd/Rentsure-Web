import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { getErrorMessage } from "@/lib/errors";
import {
  createRentScoreRule,
  getRentScoreConfig,
  updateRentScorePolicy,
  updateRentScoreRule,
  type RentScoreConfig
} from "@/lib/rent-score-api";

type PolicyDraft = {
  name: string;
  description: string;
  minScore: string;
  maxScore: string;
  isActive: boolean;
};

type RuleDraft = {
  name: string;
  description: string;
  points: string;
  maxOccurrences: string;
  sortOrder: string;
  isActive: boolean;
};

type RuleDraftMap = Record<string, RuleDraft>;

type NewRuleDraft = {
  code: string;
  name: string;
  description: string;
  points: string;
  maxOccurrences: string;
  sortOrder: string;
  isActive: boolean;
};

function buildPolicyDraft(config: RentScoreConfig): PolicyDraft {
  return {
    name: config.name,
    description: config.description || "",
    minScore: String(config.minScore),
    maxScore: String(config.maxScore),
    isActive: config.isActive
  };
}

function buildRuleDrafts(config: RentScoreConfig): RuleDraftMap {
  return Object.fromEntries(
    config.rules.map((rule) => [
      rule.id,
      {
        name: rule.name,
        description: rule.description || "",
        points: String(rule.points),
        maxOccurrences: rule.maxOccurrences == null ? "" : String(rule.maxOccurrences),
        sortOrder: String(rule.sortOrder),
        isActive: rule.isActive
      }
    ])
  );
}

const emptyRuleDraft: NewRuleDraft = {
  code: "",
  name: "",
  description: "",
  points: "",
  maxOccurrences: "",
  sortOrder: "",
  isActive: true
};

export default function RentScoreAdminPage() {
  const [config, setConfig] = useState<RentScoreConfig | null>(null);
  const [policyDraft, setPolicyDraft] = useState<PolicyDraft | null>(null);
  const [ruleDrafts, setRuleDrafts] = useState<RuleDraftMap>({});
  const [newRule, setNewRule] = useState<NewRuleDraft>(emptyRuleDraft);
  const [loading, setLoading] = useState(true);
  const [savingPolicy, setSavingPolicy] = useState(false);
  const [savingRuleId, setSavingRuleId] = useState<string | null>(null);
  const [creatingRule, setCreatingRule] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadConfig() {
    try {
      setLoading(true);
      setError(null);
      const response = await getRentScoreConfig();
      setConfig(response);
      setPolicyDraft(buildPolicyDraft(response));
      setRuleDrafts(buildRuleDrafts(response));
    } catch (loadError: unknown) {
      setError(getErrorMessage(loadError, "Failed to load rent score configuration"));
      setConfig(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadConfig();
  }, []);

  const sortedRules = useMemo(
    () => [...(config?.rules || [])].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)),
    [config]
  );

  async function savePolicy() {
    if (!policyDraft) return;
    try {
      setSavingPolicy(true);
      const updated = await updateRentScorePolicy({
        name: policyDraft.name.trim(),
        description: policyDraft.description.trim() || null,
        minScore: Number(policyDraft.minScore),
        maxScore: Number(policyDraft.maxScore),
        isActive: policyDraft.isActive
      });
      setConfig(updated);
      setPolicyDraft(buildPolicyDraft(updated));
      setRuleDrafts(buildRuleDrafts(updated));
      toast.success("Rent score policy updated");
    } catch (saveError: unknown) {
      toast.error(getErrorMessage(saveError, "Failed to update rent score policy"));
    } finally {
      setSavingPolicy(false);
    }
  }

  async function saveRule(ruleId: string) {
    const draft = ruleDrafts[ruleId];
    if (!draft) return;
    try {
      setSavingRuleId(ruleId);
      const updated = await updateRentScoreRule(ruleId, {
        name: draft.name.trim(),
        description: draft.description.trim() || null,
        points: Number(draft.points),
        maxOccurrences: draft.maxOccurrences.trim() ? Number(draft.maxOccurrences) : null,
        sortOrder: Number(draft.sortOrder),
        isActive: draft.isActive
      });
      setConfig(updated);
      setPolicyDraft(buildPolicyDraft(updated));
      setRuleDrafts(buildRuleDrafts(updated));
      toast.success("Rule updated");
    } catch (saveError: unknown) {
      toast.error(getErrorMessage(saveError, "Failed to update rule"));
    } finally {
      setSavingRuleId(null);
    }
  }

  async function submitNewRule() {
    try {
      setCreatingRule(true);
      const updated = await createRentScoreRule({
        code: newRule.code.trim(),
        name: newRule.name.trim(),
        description: newRule.description.trim() || null,
        points: Number(newRule.points),
        maxOccurrences: newRule.maxOccurrences.trim() ? Number(newRule.maxOccurrences) : null,
        sortOrder: newRule.sortOrder.trim() ? Number(newRule.sortOrder) : undefined,
        isActive: newRule.isActive
      });
      setConfig(updated);
      setPolicyDraft(buildPolicyDraft(updated));
      setRuleDrafts(buildRuleDrafts(updated));
      setNewRule(emptyRuleDraft);
      toast.success("New rule created");
    } catch (createError: unknown) {
      toast.error(getErrorMessage(createError, "Failed to create new rule"));
    } finally {
      setCreatingRule(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950">Rent score configuration</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Configure the live 0 to 900 scoring policy and manage the rule weights used across RentSure.
          </p>
        </div>
        {config ? (
          <Badge className="w-fit border border-[var(--rentsure-blue-soft)] bg-[var(--rentsure-blue-soft)] text-[var(--rentsure-blue)]">
            Updated {new Date(config.updatedAt).toLocaleDateString()}
          </Badge>
        ) : null}
      </div>

      {loading ? <p className="text-sm text-muted-foreground">Loading configuration...</p> : null}
      {!loading && error ? <p className="text-sm text-rose-600">{error}</p> : null}

      {config && policyDraft ? (
        <>
          <div className="grid gap-4 lg:grid-cols-4">
            <MetricCard label="Score range" value={`${config.minScore} - ${config.maxScore}`} />
            <MetricCard label="Active rules" value={String(config.rules.filter((rule) => rule.isActive).length)} />
            <MetricCard label="Positive rules" value={String(config.rules.filter((rule) => rule.points > 0).length)} />
            <MetricCard label="Negative rules" value={String(config.rules.filter((rule) => rule.points < 0).length)} />
          </div>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Policy settings</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="policyName">Policy name</Label>
                <Input
                  id="policyName"
                  value={policyDraft.name}
                  onChange={(event) => setPolicyDraft((current) => current ? { ...current, name: event.target.value } : current)}
                  className="bg-white"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="minScore">Minimum score</Label>
                  <Input
                    id="minScore"
                    type="number"
                    min="0"
                    max="900"
                    value={policyDraft.minScore}
                    onChange={(event) => setPolicyDraft((current) => current ? { ...current, minScore: event.target.value } : current)}
                    className="bg-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxScore">Maximum score</Label>
                  <Input
                    id="maxScore"
                    type="number"
                    min="0"
                    max="900"
                    value={policyDraft.maxScore}
                    onChange={(event) => setPolicyDraft((current) => current ? { ...current, maxScore: event.target.value } : current)}
                    className="bg-white"
                  />
                </div>
              </div>

              <div className="space-y-2 lg:col-span-2">
                <Label htmlFor="policyDescription">Description</Label>
                <Textarea
                  id="policyDescription"
                  value={policyDraft.description}
                  onChange={(event) => setPolicyDraft((current) => current ? { ...current, description: event.target.value } : current)}
                  className="min-h-[96px] bg-white"
                />
              </div>

              <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={policyDraft.isActive}
                  onChange={(event) => setPolicyDraft((current) => current ? { ...current, isActive: event.target.checked } : current)}
                  className="h-4 w-4 rounded border-slate-300 text-[var(--rentsure-blue)] focus:ring-[var(--rentsure-blue)]"
                />
                Policy active
              </label>

              <div className="lg:col-span-2">
                <Button onClick={() => void savePolicy()} disabled={savingPolicy} className="bg-[var(--rentsure-blue)] hover:bg-[var(--rentsure-blue-deep)]">
                  {savingPolicy ? "Saving policy..." : "Save policy"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Rule library</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {sortedRules.map((rule) => {
                  const draft = ruleDrafts[rule.id];
                  if (!draft) return null;
                  return (
                    <div key={rule.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-950">{rule.code}</p>
                          <p className="text-xs text-muted-foreground">Used across renter score calculations</p>
                        </div>
                        <Badge variant="outline">{draft.isActive ? "Active" : "Inactive"}</Badge>
                      </div>

                      <div className="mt-4 grid gap-4 lg:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor={`name-${rule.id}`}>Rule name</Label>
                          <Input
                            id={`name-${rule.id}`}
                            value={draft.name}
                            onChange={(event) =>
                              setRuleDrafts((current) => ({
                                ...current,
                                [rule.id]: { ...current[rule.id], name: event.target.value }
                              }))
                            }
                            className="bg-white"
                          />
                        </div>

                        <div className="grid gap-4 sm:grid-cols-3">
                          <div className="space-y-2">
                            <Label htmlFor={`points-${rule.id}`}>Points</Label>
                            <Input
                              id={`points-${rule.id}`}
                              type="number"
                              value={draft.points}
                              onChange={(event) =>
                                setRuleDrafts((current) => ({
                                  ...current,
                                  [rule.id]: { ...current[rule.id], points: event.target.value }
                                }))
                              }
                              className="bg-white"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`max-${rule.id}`}>Cap</Label>
                            <Input
                              id={`max-${rule.id}`}
                              type="number"
                              min="1"
                              value={draft.maxOccurrences}
                              onChange={(event) =>
                                setRuleDrafts((current) => ({
                                  ...current,
                                  [rule.id]: { ...current[rule.id], maxOccurrences: event.target.value }
                                }))
                              }
                              className="bg-white"
                              placeholder="None"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`order-${rule.id}`}>Order</Label>
                            <Input
                              id={`order-${rule.id}`}
                              type="number"
                              min="0"
                              value={draft.sortOrder}
                              onChange={(event) =>
                                setRuleDrafts((current) => ({
                                  ...current,
                                  [rule.id]: { ...current[rule.id], sortOrder: event.target.value }
                                }))
                              }
                              className="bg-white"
                            />
                          </div>
                        </div>

                        <div className="space-y-2 lg:col-span-2">
                          <Label htmlFor={`description-${rule.id}`}>Description</Label>
                          <Textarea
                            id={`description-${rule.id}`}
                            value={draft.description}
                            onChange={(event) =>
                              setRuleDrafts((current) => ({
                                ...current,
                                [rule.id]: { ...current[rule.id], description: event.target.value }
                              }))
                            }
                            rows={2}
                            className="min-h-[56px] resize-none bg-white"
                          />
                        </div>
                      </div>

                      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
                          <input
                            type="checkbox"
                            checked={draft.isActive}
                            onChange={(event) =>
                              setRuleDrafts((current) => ({
                                ...current,
                                [rule.id]: { ...current[rule.id], isActive: event.target.checked }
                              }))
                            }
                            className="h-4 w-4 rounded border-slate-300 text-[var(--rentsure-blue)] focus:ring-[var(--rentsure-blue)]"
                          />
                          Rule active
                        </label>

                        <Button
                          onClick={() => void saveRule(rule.id)}
                          disabled={savingRuleId === rule.id}
                          className="bg-[var(--rentsure-blue)] hover:bg-[var(--rentsure-blue-deep)]"
                        >
                          {savingRuleId === rule.id ? "Saving..." : "Save rule"}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Plus className="h-4 w-4 text-[var(--rentsure-blue)]" />
                  Add new rule
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newRuleCode">Rule code</Label>
                  <Input
                    id="newRuleCode"
                    value={newRule.code}
                    onChange={(event) => setNewRule((current) => ({ ...current, code: event.target.value }))}
                    placeholder="EMPLOYMENT_CONFIRMATION"
                    className="bg-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newRuleName">Rule name</Label>
                  <Input
                    id="newRuleName"
                    value={newRule.name}
                    onChange={(event) => setNewRule((current) => ({ ...current, name: event.target.value }))}
                    className="bg-white"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="newRulePoints">Points</Label>
                    <Input
                      id="newRulePoints"
                      type="number"
                      value={newRule.points}
                      onChange={(event) => setNewRule((current) => ({ ...current, points: event.target.value }))}
                      className="bg-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newRuleCap">Cap</Label>
                    <Input
                      id="newRuleCap"
                      type="number"
                      min="1"
                      value={newRule.maxOccurrences}
                      onChange={(event) => setNewRule((current) => ({ ...current, maxOccurrences: event.target.value }))}
                      placeholder="Optional"
                      className="bg-white"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newRuleOrder">Sort order</Label>
                  <Input
                    id="newRuleOrder"
                    type="number"
                    min="0"
                    value={newRule.sortOrder}
                    onChange={(event) => setNewRule((current) => ({ ...current, sortOrder: event.target.value }))}
                    placeholder="Optional"
                    className="bg-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newRuleDescription">Description</Label>
                  <Textarea
                    id="newRuleDescription"
                    value={newRule.description}
                    onChange={(event) => setNewRule((current) => ({ ...current, description: event.target.value }))}
                    className="min-h-[104px] bg-white"
                  />
                </div>

                <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={newRule.isActive}
                    onChange={(event) => setNewRule((current) => ({ ...current, isActive: event.target.checked }))}
                    className="h-4 w-4 rounded border-slate-300 text-[var(--rentsure-blue)] focus:ring-[var(--rentsure-blue)]"
                  />
                  Start as active rule
                </label>

                <Button onClick={() => void submitNewRule()} disabled={creatingRule} className="w-full bg-[var(--rentsure-blue)] hover:bg-[var(--rentsure-blue-deep)]">
                  {creatingRule ? "Creating rule..." : "Create rule"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{value}</p>
    </div>
  );
}
