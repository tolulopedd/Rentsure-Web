import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getErrorMessage } from "@/lib/errors";
import {
  deleteRentScoreCategory,
  deleteRentScoreRule,
  getRentScoreSetup,
  updateRentScoreCategory,
  updateRentScoreRule,
  type RentScoreCategoryConfig,
  type RentScoreConfig,
  type RentScoreRuleConfig
} from "@/lib/rent-score-api";

type CategoryDraft = {
  name: string;
  maxScore: string;
};

type RuleDraft = {
  name: string;
  points: string;
};

type CategoryDraftMap = Record<string, CategoryDraft>;
type RuleDraftMap = Record<string, RuleDraft>;

function buildCategoryDrafts(categories: RentScoreCategoryConfig[]): CategoryDraftMap {
  return Object.fromEntries(
    categories.map((category) => [
      category.id,
      {
        name: category.name,
        maxScore: String(category.maxScore)
      }
    ])
  );
}

function buildRuleDrafts(rules: RentScoreRuleConfig[]): RuleDraftMap {
  return Object.fromEntries(
    rules.map((rule) => [
      rule.id,
      {
        name: rule.name,
        points: String(rule.points)
      }
    ])
  );
}

function configuredCategoryPoints(
  categoryCode: RentScoreCategoryConfig["code"],
  rules: RentScoreRuleConfig[],
  drafts: RuleDraftMap
) {
  const activeRules = rules.map((rule) => ({
    ...rule,
    points: Number(drafts[rule.id]?.points ?? rule.points) || 0
  }));

  if (categoryCode === "IDENTITY_VERIFICATION") {
    return activeRules.reduce((sum, rule) => sum + Math.max(rule.points, 0), 0);
  }

  if (categoryCode === "PAYMENT") {
    const rentCodes = [
      "RENT_PAID_ON_OR_BEFORE_DUE_DATE",
      "RENT_PAID_WITHIN_GRACE_PERIOD",
      "RENT_PAID_31_TO_90_DAYS_LATE",
      "RENT_PAID_OVER_90_DAYS_LATE",
      "RENT_DEFAULTED_OR_EVICTED"
    ];
    const utilityCodes = [
      "UTILITY_NO_OUTSTANDING_DEBT",
      "UTILITY_MINOR_OUTSTANDING_DEBT",
      "UTILITY_SIGNIFICANT_OUTSTANDING_DEBT",
      "UTILITY_DISCONNECTION"
    ];

    const maxRent = activeRules.filter((rule) => rentCodes.includes(rule.code)).reduce((max, rule) => Math.max(max, rule.points), 0);
    const maxUtility = activeRules.filter((rule) => utilityCodes.includes(rule.code)).reduce((max, rule) => Math.max(max, rule.points), 0);
    return Math.max(maxRent, 0) + Math.max(maxUtility, 0);
  }

  if (categoryCode === "RENTER_BEHAVIOUR") {
    const ratingCodes = [
      "RENTAL_BEHAVIOUR_EXCELLENT",
      "RENTAL_BEHAVIOUR_GOOD",
      "RENTAL_BEHAVIOUR_FAIR",
      "RENTAL_BEHAVIOUR_POOR"
    ];
    return activeRules.filter((rule) => ratingCodes.includes(rule.code)).reduce((max, rule) => Math.max(max, rule.points), 0);
  }

  return activeRules.reduce((max, rule) => Math.max(max, rule.points), 0);
}

export default function RentScoreSetupPage() {
  const [config, setConfig] = useState<RentScoreConfig | null>(null);
  const [categoryDrafts, setCategoryDrafts] = useState<CategoryDraftMap>({});
  const [ruleDrafts, setRuleDrafts] = useState<RuleDraftMap>({});
  const [selectedCategoryCode, setSelectedCategoryCode] = useState<RentScoreCategoryConfig["code"] | "">("");
  const [loading, setLoading] = useState(true);
  const [savingCategoryId, setSavingCategoryId] = useState<string | null>(null);
  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(null);
  const [savingRuleId, setSavingRuleId] = useState<string | null>(null);
  const [deletingRuleId, setDeletingRuleId] = useState<string | null>(null);

  async function loadSetup(nextCategoryCode?: RentScoreCategoryConfig["code"] | "") {
    try {
      setLoading(true);
      const response = await getRentScoreSetup();
      setConfig(response);
      const activeCategories = response.categories.filter((category) => category.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
      setCategoryDrafts(buildCategoryDrafts(activeCategories));
      setRuleDrafts(buildRuleDrafts(response.rules.filter((rule) => rule.isActive)));
      setSelectedCategoryCode((current) => {
        if (nextCategoryCode && activeCategories.some((category) => category.code === nextCategoryCode)) {
          return nextCategoryCode;
        }
        if (current && activeCategories.some((category) => category.code === current)) {
          return current;
        }
        return activeCategories[0]?.code || "";
      });
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to load rent score setup"));
      setConfig(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadSetup();
  }, []);

  const categories = useMemo(
    () => (config?.categories || []).filter((category) => category.isActive).sort((a, b) => a.sortOrder - b.sortOrder),
    [config]
  );

  useEffect(() => {
    if (!categories.length) {
      setSelectedCategoryCode("");
      return;
    }

    if (!selectedCategoryCode || !categories.some((category) => category.code === selectedCategoryCode)) {
      setSelectedCategoryCode(categories[0]?.code || "");
    }
  }, [categories, selectedCategoryCode]);

  const rules = useMemo(
    () => (config?.rules || []).filter((rule) => rule.isActive).sort((a, b) => a.sortOrder - b.sortOrder),
    [config]
  );

  const selectedCategory = useMemo(
    () => categories.find((category) => category.code === selectedCategoryCode) || null,
    [categories, selectedCategoryCode]
  );

  const categoryRules = useMemo(
    () => rules.filter((rule) => rule.categoryCode === selectedCategoryCode),
    [rules, selectedCategoryCode]
  );

  const selectedCategoryRuleTotal = useMemo(
    () => (selectedCategory ? configuredCategoryPoints(selectedCategory.code, categoryRules, ruleDrafts) : 0),
    [categoryRules, ruleDrafts, selectedCategory]
  );

  async function saveCategory(category: RentScoreCategoryConfig) {
    const draft = categoryDrafts[category.id];
    if (!draft) return;

    try {
      setSavingCategoryId(category.id);
      await updateRentScoreCategory(category.id, {
        name: draft.name.trim(),
        maxScore: Number(draft.maxScore)
      });
      await loadSetup(category.code);
      toast.success("Category updated");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to update category"));
    } finally {
      setSavingCategoryId(null);
    }
  }

  async function removeCategory(categoryId: string) {
    try {
      setDeletingCategoryId(categoryId);
      await deleteRentScoreCategory(categoryId);
      await loadSetup();
      toast.success("Category deleted");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to delete category"));
    } finally {
      setDeletingCategoryId(null);
    }
  }

  async function saveRule(rule: RentScoreRuleConfig) {
    const draft = ruleDrafts[rule.id];
    if (!draft) return;

    try {
      setSavingRuleId(rule.id);
      await updateRentScoreRule(rule.id, {
        name: draft.name.trim(),
        points: Number(draft.points)
      });
      await loadSetup(rule.categoryCode);
      toast.success("Point row updated");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to update point row"));
    } finally {
      setSavingRuleId(null);
    }
  }

  async function removeRule(ruleId: string) {
    try {
      setDeletingRuleId(ruleId);
      await deleteRentScoreRule(ruleId);
      await loadSetup(selectedCategoryCode);
      toast.success("Point row deleted");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to delete point row"));
    } finally {
      setDeletingRuleId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--rentsure-blue)]">Admin workflow</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">Rent Score Setup</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Keep category totals simple, then select a category to manage the point rows that belong to it.
        </p>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="text-lg">Category setup</CardTitle>
          <Badge variant="outline">{categories.length} active</Badge>
        </CardHeader>
        <CardContent>
          {loading ? <p className="text-sm text-muted-foreground">Loading rent score setup...</p> : null}
          {!loading && !categories.length ? <p className="text-sm text-muted-foreground">No active categories available right now.</p> : null}

          {!loading && selectedCategory ? (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-[1.4fr_1fr_1fr_auto]">
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Category</p>
                  <Select value={selectedCategoryCode} onValueChange={(value) => setSelectedCategoryCode(value as RentScoreCategoryConfig["code"])}>
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      {categories.map((category) => (
                        <SelectItem key={category.code} value={category.code}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Category name</p>
                  <Input
                    value={categoryDrafts[selectedCategory.id]?.name || ""}
                    onChange={(event) =>
                      setCategoryDrafts((current) => ({
                        ...current,
                        [selectedCategory.id]: {
                          ...current[selectedCategory.id],
                          name: event.target.value
                        }
                      }))
                    }
                    className="bg-white"
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Max score</p>
                  <Input
                    type="number"
                    min="0"
                    max="900"
                    value={categoryDrafts[selectedCategory.id]?.maxScore || ""}
                    onChange={(event) =>
                      setCategoryDrafts((current) => ({
                        ...current,
                        [selectedCategory.id]: {
                          ...current[selectedCategory.id],
                          maxScore: event.target.value
                        }
                      }))
                    }
                    className="bg-white"
                  />
                </div>
                <div className="flex items-end justify-end gap-2">
                  <Button
                    variant="outline"
                    disabled={savingCategoryId === selectedCategory.id}
                    onClick={() => void saveCategory(selectedCategory)}
                  >
                    {savingCategoryId === selectedCategory.id ? "Saving..." : "Save"}
                  </Button>
                  <Button
                    variant="ghost"
                    className="text-rose-600 hover:text-rose-700"
                    disabled={deletingCategoryId === selectedCategory.id}
                    onClick={() => void removeCategory(selectedCategory.id)}
                  >
                    {deletingCategoryId === selectedCategory.id ? "Deleting..." : "Delete"}
                  </Button>
                </div>
              </div>

              <Table>
                <TableHeader>
                      <TableRow>
                        <TableHead>Category</TableHead>
                        <TableHead className="w-40">Max Score</TableHead>
                        <TableHead className="w-40">Point Rows</TableHead>
                        <TableHead className="w-32">Configured Points</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell>{categoryDrafts[selectedCategory.id]?.name || selectedCategory.name}</TableCell>
                        <TableCell>{categoryDrafts[selectedCategory.id]?.maxScore || selectedCategory.maxScore}</TableCell>
                        <TableCell>{categoryRules.length}</TableCell>
                        <TableCell>{selectedCategoryRuleTotal}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <CardTitle className="text-lg">{selectedCategory?.name || "Category points"}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Select a category above to view and manage the point rows under it.
            </p>
          </div>
          {selectedCategory ? (
            <Badge variant="outline">
              {categoryRules.length} rows | {selectedCategoryRuleTotal} pts
            </Badge>
          ) : null}
        </CardHeader>
        <CardContent>
          {!selectedCategory ? <p className="text-sm text-muted-foreground">Pick a category to continue.</p> : null}

          {selectedCategory && !categoryRules.length ? (
            <p className="text-sm text-muted-foreground">No point rows are configured for this category yet.</p>
          ) : null}

          {selectedCategory && categoryRules.length ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">S/N</TableHead>
                    <TableHead>Point Row</TableHead>
                    <TableHead className="w-40">Points</TableHead>
                    <TableHead className="w-44 text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categoryRules.map((rule, index) => (
                    <TableRow key={rule.id}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>
                        <Input
                          value={ruleDrafts[rule.id]?.name || ""}
                          onChange={(event) =>
                            setRuleDrafts((current) => ({
                              ...current,
                              [rule.id]: {
                                ...current[rule.id],
                                name: event.target.value
                              }
                            }))
                          }
                          className="bg-white"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="-900"
                          max="900"
                          value={ruleDrafts[rule.id]?.points || ""}
                          onChange={(event) =>
                            setRuleDrafts((current) => ({
                              ...current,
                              [rule.id]: {
                                ...current[rule.id],
                                points: event.target.value
                              }
                            }))
                          }
                          className="bg-white"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            disabled={savingRuleId === rule.id}
                            onClick={() => void saveRule(rule)}
                          >
                            {savingRuleId === rule.id ? "Saving..." : "Save"}
                          </Button>
                          <Button
                            variant="ghost"
                            className="text-rose-600 hover:text-rose-700"
                            disabled={deletingRuleId === rule.id}
                            onClick={() => void removeRule(rule.id)}
                          >
                            {deletingRuleId === rule.id ? "Deleting..." : "Delete"}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
