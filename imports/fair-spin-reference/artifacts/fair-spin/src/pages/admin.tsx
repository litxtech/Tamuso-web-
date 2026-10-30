import React, { useState } from 'react';
import { Layout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useGetFairSpinConfig, useUpdateFairSpinConfig, useGetFairSpinAudit, FairSpinConfigInputProfile } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, Settings2, Database } from 'lucide-react';

export default function Admin() {
  const queryClient = useQueryClient();
  const { data: config, isLoading: configLoading } = useGetFairSpinConfig();
  const { data: auditLogs, isLoading: auditLoading } = useGetFairSpinAudit();
  
  const updateConfig = useUpdateFairSpinConfig();
  
  const [selectedProfile, setSelectedProfile] = useState<FairSpinConfigInputProfile | null>(null);

  const handleProfileChange = (profile: FairSpinConfigInputProfile) => {
    updateConfig.mutate(
      { data: { profile } },
      {
        onSuccess: (newConfig) => {
          setSelectedProfile(null);
          queryClient.setQueryData(['/api/fair-spin/config'], newConfig);
        }
      }
    );
  };

  const activeProfile = selectedProfile || config?.profile;

  if (configLoading) {
    return (
      <Layout>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 pb-12 p-4 text-white relative z-10">
        <div className="mb-8">
          <h1 className="text-2xl font-light tracking-[0.2em] text-white mb-2">
            YÖNETİM
          </h1>
          <p className="text-[11px] text-white/50 uppercase tracking-wider font-bold">Küresel oyun profilleri ve denetim logları</p>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <Card className="metallic-panel border-0 rounded-2xl overflow-hidden">
            <CardHeader className="pb-4 border-b border-white/5 bg-white/5">
              <CardTitle className="flex items-center gap-2 text-sm text-primary uppercase tracking-widest font-bold">
                <Settings2 className="w-4 h-4" />
                Sistem Konfigürasyonu
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-2">
                {(Object.values(FairSpinConfigInputProfile)).map((profile) => (
                  <button 
                    key={profile}
                    onClick={() => handleProfileChange(profile)}
                    disabled={updateConfig.isPending}
                    className={`px-5 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all border ${
                      activeProfile === profile 
                        ? 'bg-primary/20 text-primary border-primary/50 shadow-[0_0_15px_rgba(200,170,110,0.2)]' 
                        : 'bg-black/40 text-white/50 border-white/10 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {profile}
                  </button>
                ))}
              </div>
              
              {config && (
                <div className="mt-8 grid grid-cols-2 gap-4">
                  <div className="bg-black/60 rounded-xl p-4 border border-white/5 shadow-inner">
                    <span className="text-[9px] uppercase tracking-[0.2em] text-white/40 block mb-1 font-bold">Hedef RTP</span>
                    <span className="text-2xl font-light text-cyan-400">%{config.rtp}</span>
                  </div>
                  <div className="bg-black/60 rounded-xl p-4 border border-white/5 shadow-inner">
                    <span className="text-[9px] uppercase tracking-[0.2em] text-white/40 block mb-1 font-bold">Para Birimi</span>
                    <span className="text-2xl font-light text-white">{config.currency}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="metallic-panel border-0 rounded-2xl overflow-hidden">
            <CardHeader className="pb-4 border-b border-white/5 bg-white/5">
              <CardTitle className="flex items-center gap-2 text-sm text-primary uppercase tracking-widest font-bold">
                <Database className="w-4 h-4" />
                İşlem Kayıtları
              </CardTitle>
            </CardHeader>
            <div className="overflow-x-auto p-0">
              <Table>
                <TableHeader className="bg-black/40">
                  <TableRow className="border-white/5 hover:bg-transparent">
                    <TableHead className="text-[9px] uppercase tracking-[0.2em] text-white/40 font-bold h-12">Spin ID</TableHead>
                    <TableHead className="text-[9px] uppercase tracking-[0.2em] text-white/40 font-bold h-12">Çarpan</TableHead>
                    <TableHead className="text-[9px] uppercase tracking-[0.2em] text-white/40 font-bold h-12">Hash Özeti</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLoading ? (
                    <TableRow className="border-white/5 hover:bg-transparent">
                      <TableCell colSpan={3} className="text-center py-8 text-white/50 text-xs">Sorgulanıyor...</TableCell>
                    </TableRow>
                  ) : auditLogs?.length === 0 ? (
                    <TableRow className="border-white/5 hover:bg-transparent">
                      <TableCell colSpan={3} className="text-center py-8 text-white/50 text-xs">Kayıt bulunamadı.</TableCell>
                    </TableRow>
                  ) : (
                    auditLogs?.slice(0, 10).map((log) => (
                      <TableRow key={log.spinId} className="border-white/5 hover:bg-white/5 transition-colors">
                        <TableCell className="font-mono text-[11px] text-white/60">{log.spinId.slice(0, 8)}...</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="border-cyan-500/30 text-cyan-300 bg-cyan-500/10 font-bold text-[9px]">
                            {log.multiplier}x
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-[10px] text-white/30 max-w-[120px] truncate" title={log.serverSeedHash}>
                          {log.serverSeedHash}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
