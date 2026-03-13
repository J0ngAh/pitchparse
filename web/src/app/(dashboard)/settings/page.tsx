"use client";

import { useMemo, useState } from "react";
import { useOrgConfig, useUpdateOrgConfig } from "@/hooks/use-org-config";
import { PageHeader } from "@/components/layout/page-header";
import { SkeletonTable } from "@/components/shared/skeleton-card";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { Save, RotateCcw, Download, Upload, Loader2, Bot } from "lucide-react";
import { useCoachPrompt, useUpdateCoachPrompt } from "@/hooks/use-coach";
import type { AppConfig } from "@/types/api";

/** Default brand color for the color picker (teal-600). Uses CSS hsl(168, 80%, 31%). */
const DEFAULT_BRAND_COLOR = "#0D9488";

export default function SettingsPage() {
  const { data: orgData, isLoading } = useOrgConfig();
  const updateConfig = useUpdateOrgConfig();

  const initialConfig = useMemo(
    () => (orgData?.config ? (orgData.config as unknown as AppConfig) : null),
    [orgData],
  );

  const [localConfig, setLocalConfig] = useState<AppConfig | null>(null);

  // Use local edits if available, otherwise server data
  const config = localConfig ?? initialConfig;
  const setConfig = setLocalConfig;

  const handleSave = async () => {
    if (!localConfig) return;
    try {
      await updateConfig.mutateAsync(localConfig as unknown as Record<string, unknown>);
      toast.success("Settings saved!");
    } catch {
      toast.error("Failed to save settings");
    }
  };

  const handleReset = async () => {
    try {
      await updateConfig.mutateAsync({});
      toast.success("Settings reset to defaults!");
    } catch {
      toast.error("Failed to reset settings");
    }
  };

  const handleExport = () => {
    if (!config) return;
    const blob = new Blob([JSON.stringify(config, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "pitchparse-config.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const imported = JSON.parse(ev.target?.result as string);
        setConfig(imported);
        toast.success("Config imported — click Save to apply");
      } catch {
        toast.error("Invalid JSON file");
      }
    };
    reader.readAsText(file);
  };

  if (isLoading || !config) {
    return (
      <div className="space-y-6">
        <PageHeader title="Settings" />
        <SkeletonTable />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Customize your organization&apos;s configuration"
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="mr-1 h-3 w-3" />
              Export
            </Button>
            <label>
              <Button variant="outline" size="sm" type="button">
                <Upload className="mr-1 h-3 w-3" />
                Import
              </Button>
              <input type="file" accept=".json" className="hidden" onChange={handleImport} />
            </label>
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw className="mr-1 h-3 w-3" />
              Reset
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={updateConfig.isPending}
            >
              {updateConfig.isPending ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <Save className="mr-1 h-3 w-3" />
              )}
              Save
            </Button>
          </div>
        }
      />

      <Tabs defaultValue="branding">
        <TabsList>
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="scoring">Scoring</TabsTrigger>
          <TabsTrigger value="kpis">KPIs</TabsTrigger>
          <TabsTrigger value="phases">Call Phases</TabsTrigger>
          <TabsTrigger value="coaching">Coaching</TabsTrigger>
          <TabsTrigger value="coach-prompt">
            <Bot className="mr-1 h-3 w-3" />
            Coach AI
          </TabsTrigger>
        </TabsList>

        {/* Branding */}
        <TabsContent value="branding">
          <Card className="border-border/50 bg-card/50">
            <CardContent className="space-y-4 pt-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Company Name</Label>
                  <p className="text-xs text-muted-foreground">
                    Your organization&apos;s display name
                  </p>
                  <Input
                    value={config.branding?.company_name || ""}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        branding: {
                          ...config.branding,
                          company_name: e.target.value,
                        },
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tagline</Label>
                  <p className="text-xs text-muted-foreground">
                    Shown in reports and the dashboard header
                  </p>
                  <Input
                    value={config.branding?.tagline || ""}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        branding: {
                          ...config.branding,
                          tagline: e.target.value,
                        },
                      })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Primary Color</Label>
                <p className="text-xs text-muted-foreground">Brand accent color for reports</p>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={config.branding?.primary_color || DEFAULT_BRAND_COLOR}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        branding: {
                          ...config.branding,
                          primary_color: e.target.value,
                        },
                      })
                    }
                    className="h-10 w-10 cursor-pointer rounded border-0 bg-transparent"
                  />
                  <Input
                    value={config.branding?.primary_color || DEFAULT_BRAND_COLOR}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        branding: {
                          ...config.branding,
                          primary_color: e.target.value,
                        },
                      })
                    }
                    className="max-w-32 font-mono"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Scoring thresholds */}
        <TabsContent value="scoring">
          <Card className="border-border/50 bg-card/50">
            <CardContent className="space-y-6 pt-6">
              {(
                [
                  { key: "exceptional" as const, hint: "Scores above this are rated exceptional" },
                  { key: "good" as const, hint: "Scores above this are rated good" },
                  {
                    key: "needs_improvement" as const,
                    hint: "Scores above this need improvement coaching",
                  },
                  {
                    key: "poor" as const,
                    hint: "Scores above this are rated poor; below is critical",
                  },
                ] as const
              ).map(({ key, hint }) => (
                <div key={key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="capitalize">{key.replace("_", " ")}</Label>
                    <span className="font-mono text-sm text-muted-foreground">
                      {config.scoring?.thresholds?.[key] || 0}
                    </span>
                  </div>
                  <Slider
                    value={[config.scoring?.thresholds?.[key] || 0]}
                    onValueChange={(val) => {
                      const v = Array.isArray(val) ? val[0] : val;
                      setConfig({
                        ...config,
                        scoring: {
                          ...config.scoring,
                          thresholds: {
                            ...config.scoring?.thresholds,
                            [key]: v,
                          },
                        },
                      });
                    }}
                    min={0}
                    max={100}
                    step={5}
                  />
                  <p className="text-xs text-muted-foreground">{hint}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* KPIs */}
        <TabsContent value="kpis">
          <Card className="border-border/50 bg-card/50">
            <CardContent className="space-y-4 pt-6">
              {(config.scoring?.kpis || []).map((kpi, i) => (
                <div
                  key={i}
                  className="grid grid-cols-4 gap-3 rounded-lg border border-border/50 p-3"
                >
                  <div className="space-y-1">
                    <Label className="text-xs">Name</Label>
                    <Input
                      value={kpi.name}
                      onChange={(e) => {
                        const kpis = [...(config.scoring?.kpis || [])];
                        kpis[i] = { ...kpis[i], name: e.target.value };
                        setConfig({
                          ...config,
                          scoring: { ...config.scoring, kpis },
                        });
                      }}
                      className="text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Short Name</Label>
                    <Input
                      value={kpi.short_name}
                      onChange={(e) => {
                        const kpis = [...(config.scoring?.kpis || [])];
                        kpis[i] = { ...kpis[i], short_name: e.target.value };
                        setConfig({
                          ...config,
                          scoring: { ...config.scoring, kpis },
                        });
                      }}
                      className="text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Weight (%)</Label>
                    <Input
                      type="number"
                      value={kpi.weight}
                      onChange={(e) => {
                        const kpis = [...(config.scoring?.kpis || [])];
                        kpis[i] = {
                          ...kpis[i],
                          weight: parseInt(e.target.value) || 0,
                        };
                        setConfig({
                          ...config,
                          scoring: { ...config.scoring, kpis },
                        });
                      }}
                      className="text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Description</Label>
                    <Input
                      value={kpi.description}
                      onChange={(e) => {
                        const kpis = [...(config.scoring?.kpis || [])];
                        kpis[i] = { ...kpis[i], description: e.target.value };
                        setConfig({
                          ...config,
                          scoring: { ...config.scoring, kpis },
                        });
                      }}
                      className="text-xs"
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Call Phases */}
        <TabsContent value="phases">
          <Card className="border-border/50 bg-card/50">
            <CardContent className="space-y-4 pt-6">
              {(config.call_structure?.phases || []).map((phase, i) => (
                <div
                  key={i}
                  className="grid grid-cols-4 gap-3 rounded-lg border border-border/50 p-3"
                >
                  <div className="space-y-1">
                    <Label className="text-xs">Name</Label>
                    <Input
                      value={phase.name}
                      onChange={(e) => {
                        const phases = [...(config.call_structure?.phases || [])];
                        phases[i] = { ...phases[i], name: e.target.value };
                        setConfig({
                          ...config,
                          call_structure: {
                            ...config.call_structure,
                            phases,
                          },
                        });
                      }}
                      className="text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Time Range</Label>
                    <Input
                      value={phase.time_range}
                      onChange={(e) => {
                        const phases = [...(config.call_structure?.phases || [])];
                        phases[i] = {
                          ...phases[i],
                          time_range: e.target.value,
                        };
                        setConfig({
                          ...config,
                          call_structure: {
                            ...config.call_structure,
                            phases,
                          },
                        });
                      }}
                      className="text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Goal</Label>
                    <Input
                      value={phase.goal}
                      onChange={(e) => {
                        const phases = [...(config.call_structure?.phases || [])];
                        phases[i] = { ...phases[i], goal: e.target.value };
                        setConfig({
                          ...config,
                          call_structure: {
                            ...config.call_structure,
                            phases,
                          },
                        });
                      }}
                      className="text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Max Score</Label>
                    <Input
                      type="number"
                      value={phase.max_score}
                      onChange={(e) => {
                        const phases = [...(config.call_structure?.phases || [])];
                        phases[i] = {
                          ...phases[i],
                          max_score: parseInt(e.target.value) || 0,
                        };
                        setConfig({
                          ...config,
                          call_structure: {
                            ...config.call_structure,
                            phases,
                          },
                        });
                      }}
                      className="text-xs"
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Coach AI Prompt */}
        <TabsContent value="coach-prompt">
          <CoachPromptEditor />
        </TabsContent>

        {/* Coaching */}
        <TabsContent value="coaching">
          <Card className="border-border/50 bg-card/50">
            <CardContent className="space-y-6 pt-6">
              <div className="space-y-2">
                <Label>Feedback Structure</Label>
                <p className="text-xs text-muted-foreground">
                  Define how coaching feedback should be structured in reports.
                </p>
                <Textarea
                  value={
                    typeof config.coaching?.feedback_structure === "string"
                      ? config.coaching.feedback_structure
                      : ""
                  }
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      coaching: {
                        ...config.coaching,
                        feedback_structure: e.target.value || null,
                      },
                    })
                  }
                  placeholder="e.g., Start with strengths, then areas for improvement, end with actionable next steps..."
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <Label>Common Scenarios</Label>
                <p className="text-xs text-muted-foreground">
                  Describe common call scenarios to help calibrate coaching recommendations.
                </p>
                <Textarea
                  value={
                    typeof config.coaching?.common_scenarios === "string"
                      ? config.coaching.common_scenarios
                      : ""
                  }
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      coaching: {
                        ...config.coaching,
                        common_scenarios: e.target.value || null,
                      },
                    })
                  }
                  placeholder="e.g., Inbound demo requests, cold outbound discovery, renewal/upsell calls..."
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CoachPromptEditor() {
  const { data: promptData, isLoading } = useCoachPrompt();
  const updatePrompt = useUpdateCoachPrompt();
  const [localPrompt, setLocalPrompt] = useState<string | null>(null);

  const currentPrompt = localPrompt ?? promptData?.prompt ?? "";
  const isCustom = promptData?.is_custom ?? false;
  const hasChanges = localPrompt !== null && localPrompt !== promptData?.prompt;

  const handleSave = async () => {
    try {
      await updatePrompt.mutateAsync(localPrompt);
      setLocalPrompt(null);
      toast.success("Coach prompt saved!");
    } catch {
      toast.error("Failed to save coach prompt");
    }
  };

  const handleReset = async () => {
    try {
      await updatePrompt.mutateAsync(null);
      setLocalPrompt(null);
      toast.success("Coach prompt reset to default!");
    } catch {
      toast.error("Failed to reset coach prompt");
    }
  };

  if (isLoading) {
    return (
      <Card className="border-border/50 bg-card/50">
        <CardContent className="flex items-center gap-3 pt-6 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading coach prompt...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 bg-card/50">
      <CardContent className="space-y-4 pt-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Coach System Prompt</Label>
            {isCustom && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                Custom
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Customize how the AI coach behaves during coaching conversations. This prompt defines
            the coach&apos;s personality, guidelines, and expertise areas tailored to your business.
          </p>
          <Textarea
            value={currentPrompt}
            onChange={(e) => setLocalPrompt(e.target.value)}
            placeholder="Enter your custom coach system prompt..."
            rows={16}
            className="font-mono text-xs"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!hasChanges || updatePrompt.isPending}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {updatePrompt.isPending ? (
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            ) : (
              <Save className="mr-1 h-3 w-3" />
            )}
            Save Prompt
          </Button>
          {isCustom && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={updatePrompt.isPending}
            >
              <RotateCcw className="mr-1 h-3 w-3" />
              Reset to Default
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
