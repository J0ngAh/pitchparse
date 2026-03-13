"use client";

import { useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useTranscripts } from "@/hooks/use-transcripts";
import { useRunAnalysis } from "@/hooks/use-analyses";
import {
  useUploadTranscript,
  useTranscribeAudio,
  useGenerateSynthetic,
} from "@/hooks/use-transcripts";
import { useAnalysisRealtime, useTranscriptRealtime } from "@/hooks/use-realtime";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/shared/status-badge";
import { MODEL_OPTIONS } from "@/lib/constants";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Upload, FileText, Loader2, CheckCircle2, XCircle, Sparkles } from "lucide-react";
import { useDropzone } from "react-dropzone";

const QUALITY_OPTIONS = [
  { value: "random", label: "Random" },
  { value: "excellent", label: "Excellent (90-100)" },
  { value: "good", label: "Good (75-89)" },
  { value: "poor", label: "Poor (40-59)" },
  { value: "terrible", label: "Terrible (0-39)" },
];

export default function AnalyzePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const preselectedTranscript = searchParams.get("transcript");

  const { data: transcripts } = useTranscripts();
  const runAnalysis = useRunAnalysis();
  const uploadTranscript = useUploadTranscript();
  const transcribeAudio = useTranscribeAudio();
  const generateSynthetic = useGenerateSynthetic();

  const [selectedTranscriptId, setSelectedTranscriptId] = useState<string>(
    preselectedTranscript || "",
  );
  const [model, setModel] = useState("claude-sonnet-4-6");
  const [focus, setFocus] = useState("");
  const [pendingAnalysisId, setPendingAnalysisId] = useState<string | null>(null);
  const [syntheticConsultant, setSyntheticConsultant] = useState("");
  const [syntheticProspect, setSyntheticProspect] = useState("");
  const [syntheticScenario, setSyntheticScenario] = useState("");
  const [syntheticQuality, setSyntheticQuality] = useState("random");
  const [generateReport, setGenerateReport] = useState(false);
  const [pendingSyntheticId, setPendingSyntheticId] = useState<string | null>(null);

  // Analysis realtime subscription
  const realtimeData = useAnalysisRealtime(
    pendingAnalysisId,
    useCallback(() => {
      toast.success("Analysis complete!");
      if (pendingAnalysisId) {
        router.push(`/calls/${pendingAnalysisId}`);
      }
    }, [pendingAnalysisId, router]),
    useCallback((error: string) => {
      toast.error(`Analysis failed: ${error}`);
      setPendingAnalysisId(null);
    }, []),
  );

  // Synthetic transcript realtime subscription
  useTranscriptRealtime(
    pendingSyntheticId,
    useCallback(() => {
      toast.success("Synthetic transcript generated!");
      if (pendingSyntheticId) {
        setSelectedTranscriptId(pendingSyntheticId);
      }
      setPendingSyntheticId(null);
    }, [pendingSyntheticId]),
    useCallback((error: string) => {
      toast.error(`Generation failed: ${error}`);
      setPendingSyntheticId(null);
    }, []),
  );

  // File upload dropzone
  const onDrop = useCallback(
    async (files: File[]) => {
      const file = files[0];
      if (!file) return;

      try {
        if (
          file.name.endsWith(".md") ||
          file.name.endsWith(".txt") ||
          file.type === "text/plain" ||
          file.type === "text/markdown"
        ) {
          const text = await file.text();
          const result = await uploadTranscript.mutateAsync({
            filename: file.name,
            body: text,
          });
          setSelectedTranscriptId(result.id);
          toast.success("Transcript uploaded!");
        } else {
          const result = await transcribeAudio.mutateAsync(file);
          setSelectedTranscriptId(result.id);
          toast.success("Audio transcribed!");
        }
      } catch {
        toast.error("Upload failed");
      }
    },
    [uploadTranscript, transcribeAudio],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/markdown": [".md"],
      "text/plain": [".txt"],
      "audio/*": [".m4a", ".mp3", ".wav", ".ogg", ".webm"],
      "video/*": [".mp4", ".webm"],
    },
    maxFiles: 1,
  });

  const handleRunAnalysis = async () => {
    if (!selectedTranscriptId) {
      toast.error("Select a transcript first");
      return;
    }
    try {
      const result = await runAnalysis.mutateAsync({
        transcriptId: selectedTranscriptId,
        model,
        focus: focus || null,
        generateReport,
      });
      setPendingAnalysisId(result.id);
      toast.info(generateReport ? "Analysis + report pipeline started..." : "Analysis started...");
    } catch {
      toast.error("Failed to start analysis");
    }
  };

  const handleGenerateSynthetic = async () => {
    try {
      const result = await generateSynthetic.mutateAsync({
        quality: syntheticQuality,
        scenario: syntheticScenario || undefined,
        consultant_name: syntheticConsultant || undefined,
        prospect_name: syntheticProspect || undefined,
      });
      setPendingSyntheticId(result.id);
      toast.info("Generating synthetic transcript...");
    } catch {
      toast.error("Failed to start synthetic generation");
    }
  };

  const isRunning =
    !!pendingAnalysisId && realtimeData?.status !== "complete" && realtimeData?.status !== "failed";

  const isSyntheticRunning = !!pendingSyntheticId;

  return (
    <div className="space-y-6">
      <PageHeader title="Analyze" description="Upload a transcript and run AI-powered analysis" />

      {/* Analysis polling status */}
      {pendingAnalysisId && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex items-center gap-4 p-4">
            {realtimeData?.status === "complete" ? (
              <>
                <CheckCircle2 className="h-5 w-5 text-green-400" />
                <div>
                  <p className="text-sm font-medium text-green-400">Analysis complete!</p>
                  <p className="text-xs text-muted-foreground">
                    Score: {realtimeData.overall_score}/100 &middot; {realtimeData.rating}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="ml-auto"
                  onClick={() => router.push(`/calls/${pendingAnalysisId}`)}
                >
                  View Results
                </Button>
              </>
            ) : realtimeData?.status === "failed" ? (
              <>
                <XCircle className="h-5 w-5 text-red-400" />
                <p className="text-sm text-red-400">
                  {realtimeData.error_message || "Analysis failed"}
                </p>
              </>
            ) : (
              <>
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <div>
                  <p className="text-sm font-medium text-primary">Analyzing...</p>
                  <p className="text-xs text-muted-foreground">This usually takes 30-60 seconds</p>
                </div>
                <StatusBadge status={realtimeData?.status || "pending"} className="ml-auto" />
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Synthetic generation polling status */}
      {pendingSyntheticId && (
        <Card className="border-violet-500/30 bg-violet-500/5">
          <CardContent className="flex items-center gap-4 p-4">
            <Loader2 className="h-5 w-5 animate-spin text-violet-400" />
            <div>
              <p className="text-sm font-medium text-violet-400">
                Generating synthetic transcript...
              </p>
              <p className="text-xs text-muted-foreground">This usually takes 30-60 seconds</p>
            </div>
            <StatusBadge status="processing" className="ml-auto" />
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue={preselectedTranscript ? "select" : "upload"}>
        <TabsList>
          <TabsTrigger value="select">
            <FileText className="mr-2 h-3 w-3" />
            Select Existing
          </TabsTrigger>
          <TabsTrigger value="upload">
            <Upload className="mr-2 h-3 w-3" />
            Upload File
          </TabsTrigger>
          <TabsTrigger value="synthetic">
            <Sparkles className="mr-2 h-3 w-3" />
            Generate Synthetic
          </TabsTrigger>
        </TabsList>

        {/* Tab: Select existing */}
        <TabsContent value="select" className="space-y-4">
          <Card className="border-border/50 bg-card/50">
            <CardContent className="p-4">
              <Label>Select Transcript</Label>
              <Select
                value={selectedTranscriptId}
                onValueChange={(v) => setSelectedTranscriptId(v || "")}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Choose a transcript..." />
                </SelectTrigger>
                <SelectContent>
                  {(transcripts || []).map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.filename} {t.consultant_name && `(${t.consultant_name})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Upload file */}
        <TabsContent value="upload" className="space-y-4">
          <Card className="border-border/50 bg-card/50">
            <CardContent className="p-4">
              <div
                {...getRootProps()}
                className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-all duration-200 ${
                  isDragActive
                    ? "border-primary bg-primary/10 glow-signal scale-[1.01]"
                    : "border-border/50 hover:border-primary/50 hover:bg-primary/5"
                }`}
              >
                <input {...getInputProps()} />
                <Upload
                  className={`h-8 w-8 transition-colors ${isDragActive ? "text-primary" : "text-muted-foreground"}`}
                />
                <p
                  className={`mt-3 text-sm ${isDragActive ? "font-medium text-primary" : "text-muted-foreground"}`}
                >
                  {isDragActive
                    ? "Release to upload"
                    : "Drag & drop a transcript (.md, .txt) or audio file (.m4a, .mp3, .wav)"}
                </p>
                {!isDragActive && (
                  <p className="mt-1 text-xs text-muted-foreground">or click to browse</p>
                )}
                {(uploadTranscript.isPending || transcribeAudio.isPending) && (
                  <div className="mt-3 flex items-center gap-2 text-sm text-primary">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {transcribeAudio.isPending ? "Transcribing audio..." : "Uploading..."}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        {/* Tab: Generate synthetic */}
        <TabsContent value="synthetic" className="space-y-4">
          <Card className="border-border/50 bg-card/50">
            <CardContent className="space-y-4 p-4">
              <p className="text-sm text-muted-foreground">
                Generate a realistic synthetic sales call transcript for testing the analysis
                pipeline.
              </p>
              <div className="space-y-2">
                <Label>Quality Level</Label>
                <Select
                  value={syntheticQuality}
                  onValueChange={(v) => setSyntheticQuality(v || "random")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {QUALITY_OPTIONS.map((q) => (
                      <SelectItem key={q.value} value={q.value}>
                        {q.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Consultant Name (optional)</Label>
                  <Input
                    placeholder="e.g. Sarah Chen"
                    value={syntheticConsultant}
                    onChange={(e) => setSyntheticConsultant(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Prospect Name (optional)</Label>
                  <Input
                    placeholder="e.g. Michael Torres"
                    value={syntheticProspect}
                    onChange={(e) => setSyntheticProspect(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Scenario (optional)</Label>
                <Textarea
                  placeholder="e.g. Inbound demo request from mid-market SaaS company exploring CRM solutions..."
                  value={syntheticScenario}
                  onChange={(e) => setSyntheticScenario(e.target.value)}
                  rows={3}
                />
              </div>
              <Button
                onClick={handleGenerateSynthetic}
                disabled={isSyntheticRunning || generateSynthetic.isPending}
                variant="outline"
                className="w-full"
              >
                {isSyntheticRunning || generateSynthetic.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate Transcript
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Analysis config */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Analysis Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Model</Label>
              <Select value={model} onValueChange={(v) => setModel(v || model)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODEL_OPTIONS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label} ({m.cost})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Focus Area (optional)</Label>
              <Input
                placeholder="e.g. objection handling, closing technique"
                value={focus}
                onChange={(e) => setFocus(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="generate-report"
              checked={generateReport}
              onCheckedChange={(checked) => setGenerateReport(checked === true)}
            />
            <Label
              htmlFor="generate-report"
              className="cursor-pointer text-sm text-muted-foreground"
            >
              Auto-generate coaching report after analysis
            </Label>
          </div>
          <Button
            onClick={handleRunAnalysis}
            disabled={!selectedTranscriptId || isRunning}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {isRunning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Run Analysis
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
