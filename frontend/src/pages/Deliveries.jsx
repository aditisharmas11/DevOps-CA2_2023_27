import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const Deliveries = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Data lists
  const [dispatches, setDispatches] = useState([]);
  const [agents, setAgents] = useState([]);

  // Assignment states
  const [updatingDispatchId, setUpdatingDispatchId] = useState(null);
  const [selectedAgent, setSelectedAgent] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [updateNotes, setUpdateNotes] = useState('');
  const [activeLogs, setActiveLogs] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [dispRes, agentsRes] = await Promise.all([
        api.get('shipments/dispatches/'),
        api.get('auth/agents/'),
      ]);
      setDispatches(dispRes.data);
      setAgents(agentsRes.data);
    } catch (err) {
      setError('Could not retrieve delivery tracking logs.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenAssignModal = (disp) => {
    setUpdatingDispatchId(disp.id);
    setSelectedAgent(disp.delivery_agent || '');
    setSelectedStatus(disp.status);
    setUpdateNotes('');
  };

  const handleSaveAssignment = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        status: selectedStatus,
        delivery_agent: selectedAgent === '' ? null : parseInt(selectedAgent),
        notes: updateNotes || `Delivery details updated by Dispatch Manager.`
      };

      await api.patch(`shipments/dispatches/${updatingDispatchId}/`, payload);
      setUpdatingDispatchId(null);
      fetchData(); // Refresh list
    } catch (err) {
      const errorMsg = err.response?.data?.status || err.response?.data?.delivery_agent?.[0] || 'Failed to update delivery.';
      alert(errorMsg);
    }
  };

  const showAuditTrail = (logs) => {
    setActiveLogs(logs);
  };

  if (loading) {
    return (
      <div className="loading-container flex flex-col items-center justify-center h-screen bg-background">
        <div className="spinner"></div>
        <p className="text-muted-foreground text-sm">Loading active deliveries tracking...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-outfit text-3xl font-bold text-foreground">Delivery Tracking & Dispatch</h1>
        <p className="text-muted-foreground text-sm mt-1">Assign delivery agents and monitor real-time shipment status transitions.</p>
      </div>

      {error && <div className="alert-danger p-4 rounded-lg bg-red-950/40 border border-red-900/50 text-red-400 text-sm">{error}</div>}

      <div className="panel-container border border-border bg-card p-6 rounded-xl space-y-6 shadow-lg">
        <div className="table-responsive rounded-xl border border-border overflow-hidden">
          <Table className="w-full text-left border-collapse">
            <TableHeader className="bg-accent/10 border-b border-border">
              <TableRow>
                <TableHead className="font-semibold text-xs text-muted-foreground uppercase py-4 px-6">Order Number</TableHead>
                <TableHead className="font-semibold text-xs text-muted-foreground uppercase py-4 px-6">Destination</TableHead>
                <TableHead className="font-semibold text-xs text-muted-foreground uppercase py-4 px-6">Expected Delivery</TableHead>
                <TableHead className="font-semibold text-xs text-muted-foreground uppercase py-4 px-6">Assigned Agent</TableHead>
                <TableHead className="font-semibold text-xs text-muted-foreground uppercase py-4 px-6">Status</TableHead>
                <TableHead className="font-semibold text-xs text-muted-foreground uppercase py-4 px-6">Audits</TableHead>
                <TableHead className="font-semibold text-xs text-muted-foreground uppercase py-4 px-6 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dispatches.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-12 px-6">
                    No dispatches recorded. Generate them in the Shipments panel first.
                  </TableCell>
                </TableRow>
              ) : (
                dispatches.map(disp => {
                  const isFinished = disp.status === 'DELIVERED' || disp.status === 'FAILED';
                  
                  return (
                    <TableRow key={disp.id} className="hover:bg-accent/10 border-b border-border last:border-none">
                      <TableCell className="font-semibold text-foreground py-4 px-6">{disp.order_number}</TableCell>
                      <TableCell className="text-foreground py-4 px-6">{disp.destination}</TableCell>
                      <TableCell className="py-4 px-6">
                        {disp.actual_delivery_date ? (
                          <div>
                            <div className="text-emerald-500 font-semibold text-sm">Delivered</div>
                            <div className="text-[10px] text-muted-foreground">
                              {new Date(disp.actual_delivery_date).toLocaleString()}
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="text-muted-foreground text-sm">Pending arrival</div>
                            <div className="text-[10px] text-muted-foreground">
                              Est: {new Date(disp.expected_delivery_date).toLocaleDateString()}
                            </div>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="py-4 px-6">
                        {disp.delivery_agent_detail ? (
                          <div>
                            <strong className="text-foreground">{disp.delivery_agent_detail.username}</strong>
                            <div className="text-[10px] text-muted-foreground">
                              {disp.delivery_agent_detail.phone || 'No phone'}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-amber-500 font-semibold italic">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell className="py-4 px-6">
                        <span className={`status-badge text-xs font-bold px-2 py-0.5 rounded ${
                          disp.status === 'DELIVERED' ? 'success' : 
                          disp.status === 'FAILED' ? 'danger' : 
                          disp.status === 'PENDING' ? 'danger' : 'warning'
                        }`}>
                          {disp.status.replace('_', ' ')}
                        </span>
                      </TableCell>
                      <TableCell className="py-4 px-6">
                        <Button 
                          variant="outline" 
                          className="bg-accent border-border hover:bg-accent/80 text-foreground font-semibold py-1 px-3 text-xs"
                          onClick={() => showAuditTrail(disp.status_logs)}
                        >
                          {disp.status_logs.length} Logs
                        </Button>
                      </TableCell>
                      <td className="py-4 px-6 text-right">
                        {!isFinished ? (
                          <Button 
                            className="bg-primary hover:bg-primary/95 text-primary-foreground font-semibold py-1 px-3 text-xs"
                            onClick={() => handleOpenAssignModal(disp)}
                          >
                            Manage
                          </Button>
                        ) : (
                          <span className="text-xs italic text-muted-foreground">Archived</span>
                        )}
                      </td>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* --- ASSIGN & MANAGE DELIVERY MODAL --- */}
      <Dialog open={!!updatingDispatchId} onOpenChange={() => setUpdatingDispatchId(null)}>
        <DialogContent className="bg-card border-border text-foreground max-w-[500px] p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-outfit text-xl font-bold">Manage Delivery Details</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSaveAssignment} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="agent-select" className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Select Delivery Agent</Label>
              <select 
                id="agent-select" 
                className="bg-accent/40 border border-border text-foreground rounded p-2.5 text-sm w-full"
                value={selectedAgent}
                onChange={(e) => setSelectedAgent(e.target.value)}
              >
                <option value="">Unassigned</option>
                {agents.map(a => (
                  <option key={a.id} value={a.id}>{a.username} ({a.phone || 'No phone'})</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="status-select" className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Status Transition</Label>
              <select 
                id="status-select" 
                className="bg-accent/40 border border-border text-foreground rounded p-2.5 text-sm w-full"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
              >
                <option value="PENDING">Pending Assignment</option>
                <option value="DISPATCHED">Dispatched (Subtracts inventory stock)</option>
                <option value="IN_TRANSIT">In Transit</option>
                <option value="DELIVERED">Delivered (Completed)</option>
                <option value="FAILED">Failed (Aborted)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="audit-notes" className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Change Audit Notes</Label>
              <Input 
                type="text" 
                id="audit-notes" 
                className="bg-accent/40 border-border" 
                placeholder="Enter reason or comments for this change..."
                value={updateNotes}
                onChange={(e) => setUpdateNotes(e.target.value)}
              />
            </div>

            <DialogFooter className="pt-4 border-t border-border gap-2">
              <Button type="button" variant="outline" className="bg-accent border-border hover:bg-accent/80 text-foreground" onClick={() => setUpdatingDispatchId(null)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-primary text-primary-foreground font-semibold">
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Audit Logs Timeline Modal */}
      <Dialog open={!!activeLogs} onOpenChange={() => setActiveLogs(null)}>
        <DialogContent className="bg-card border-border text-foreground max-w-[500px] p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-outfit text-xl font-bold">Delivery Status Logs</DialogTitle>
          </DialogHeader>
          
          <div className="modal-body max-h-[60vh] overflow-y-auto pr-1 py-4">
            {!activeLogs || activeLogs.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center">No status logs recorded.</p>
            ) : (
              <div className="timeline">
                {activeLogs.map((log) => (
                  <div key={log.id} className="timeline-item">
                    <div className="timeline-dot"></div>
                    <div className="timeline-content bg-accent/10 border border-border p-4 rounded-xl space-y-3">
                      <div className="timeline-header flex justify-between items-center">
                        <span className={`status-badge text-[10px] font-bold px-2 py-0.5 rounded ${
                          log.status === 'DELIVERED' ? 'success' :
                          log.status === 'FAILED' ? 'danger' :
                          log.status === 'PENDING' ? 'danger' : 'warning'
                        }`}>
                          {log.status.replace('_', ' ')}
                        </span>
                        <span className="timeline-time text-[10px] text-muted-foreground">{new Date(log.timestamp).toLocaleString()}</span>
                      </div>
                      <p className="timeline-notes text-sm text-foreground font-normal">{log.notes || 'No comments.'}</p>
                      <div className="timeline-user text-[10px] text-muted-foreground font-semibold">Updated by: {log.updated_by_username}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <DialogFooter className="pt-4 border-t border-border">
            <Button variant="outline" className="bg-accent border-border hover:bg-accent/80 text-foreground" onClick={() => setActiveLogs(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Deliveries;
