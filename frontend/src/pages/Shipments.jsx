import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const Shipments = () => {
  const [activeTab, setActiveTab] = useState('inbound'); // 'inbound' or 'outbound'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Loaded data
  const [pos, setPos] = useState([]);
  const [dispatches, setDispatches] = useState([]);
  const [stockItems, setStockItems] = useState([]);
  const [agents, setAgents] = useState([]);

  // Modals state
  const [poModalOpen, setPoModalOpen] = useState(false);
  const [grnModalOpen, setGrnModalOpen] = useState(false);
  const [dispatchModalOpen, setDispatchModalOpen] = useState(false);
  const [formError, setFormError] = useState('');
  const [activeLogs, setActiveLogs] = useState(null);

  // --- CREATE PO FORM STATES ---
  const [poNumber, setPoNumber] = useState('');
  const [poSupplier, setPoSupplier] = useState('');
  const [poExpectedDate, setPoExpectedDate] = useState('');
  const [poItems, setPoItems] = useState([{ stock_item: '', quantity_ordered: 1 }]);

  // --- LOG GRN FORM STATES ---
  const [selectedPo, setSelectedPo] = useState(null);
  const [grnNumber, setGrnNumber] = useState('');
  const [grnItems, setGrnItems] = useState([]); // Array of { stock_item: id, stock_item_name: name, quantity_received: val }

  // --- CREATE DISPATCH FORM STATES ---
  const [dispNumber, setDispNumber] = useState('');
  const [dispDestination, setDispDestination] = useState('');
  const [dispExpectedDate, setDispExpectedDate] = useState('');
  const [dispAgent, setDispAgent] = useState('');
  const [dispStatus, setDispStatus] = useState('PENDING');
  const [dispItems, setDispItems] = useState([{ stock_item: '', quantity: 1 }]);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [posRes, dispRes, itemsRes, agentsRes] = await Promise.all([
        api.get('shipments/purchase-orders/'),
        api.get('shipments/dispatches/'),
        api.get('inventory/items/'),
        api.get('auth/agents/'),
      ]);
      setPos(posRes.data);
      setDispatches(dispRes.data);
      setStockItems(itemsRes.data);
      setAgents(agentsRes.data);
    } catch (err) {
      setError('Could not load shipping logs.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // --- PURCHASE ORDER CREATION ---
  const openPoModal = () => {
    setFormError('');
    setPoNumber(`PO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
    setPoSupplier('');
    setPoExpectedDate('');
    setPoItems([{ stock_item: '', quantity_ordered: 1 }]);
    setPoModalOpen(true);
  };

  const addPoItemRow = () => {
    setPoItems([...poItems, { stock_item: '', quantity_ordered: 1 }]);
  };

  const removePoItemRow = (index) => {
    const values = [...poItems];
    values.splice(index, 1);
    setPoItems(values);
  };

  const handlePoItemChange = (index, field, value) => {
    const values = [...poItems];
    values[index][field] = value;
    setPoItems(values);
  };

  const handleSavePo = async (e) => {
    e.preventDefault();
    setFormError('');

    // Filter out invalid items
    const validItems = poItems.filter(item => item.stock_item !== '');
    if (validItems.length === 0) {
      setFormError('Please add at least one stock item.');
      return;
    }

    const payload = {
      po_number: poNumber,
      supplier: poSupplier,
      expected_delivery_date: poExpectedDate ? new Date(poExpectedDate).toISOString() : null,
      items: validItems.map(item => ({
        stock_item: parseInt(item.stock_item),
        quantity_ordered: parseInt(item.quantity_ordered)
      }))
    };

    try {
      await api.post('shipments/purchase-orders/', payload);
      setPoModalOpen(false);
      fetchData();
    } catch (err) {
      setFormError(err.response?.data?.po_number?.[0] || 'Failed to create Purchase Order.');
    }
  };

  // --- GRN LOGGING ---
  const openGrnModal = (po) => {
    setFormError('');
    setSelectedPo(po);
    setGrnNumber(`GRN-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
    
    // Prefill GRN items form with matching PO item targets
    const prefilledItems = po.items.map(item => ({
      stock_item: item.stock_item,
      stock_item_name: item.stock_item_name,
      stock_item_sku: item.stock_item_sku,
      quantity_received: item.quantity_ordered, // default to order size
    }));
    setGrnItems(prefilledItems);
    setGrnModalOpen(true);
  };

  const handleGrnItemChange = (index, value) => {
    const values = [...grnItems];
    values[index].quantity_received = parseInt(value) || 0;
    setGrnItems(values);
  };

  const handleSaveGrn = async (e) => {
    e.preventDefault();
    setFormError('');

    const payload = {
      grn_number: grnNumber,
      purchase_order: selectedPo.id,
      items: grnItems.map(item => ({
        stock_item: item.stock_item,
        quantity_received: item.quantity_received
      }))
    };

    try {
      await api.post('shipments/grns/', payload);
      setGrnModalOpen(false);
      fetchData();
    } catch (err) {
      const errorMsg = err.response?.data?.non_field_errors?.[0] || err.response?.data?.grn_number?.[0] || 'Failed to register GRN.';
      setFormError(errorMsg);
    }
  };

  // --- DISPATCH ORDER CREATION ---
  const openDispatchModal = () => {
    setFormError('');
    setDispNumber(`DISP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
    setDispDestination('');
    setDispExpectedDate('');
    setDispAgent('');
    setDispStatus('PENDING');
    setDispItems([{ stock_item: '', quantity: 1 }]);
    setDispatchModalOpen(true);
  };

  const addDispItemRow = () => {
    setDispItems([...dispItems, { stock_item: '', quantity: 1 }]);
  };

  const removeDispItemRow = (index) => {
    const values = [...dispItems];
    values.splice(index, 1);
    setDispItems(values);
  };

  const handleDispItemChange = (index, field, value) => {
    const values = [...dispItems];
    values[index][field] = value;
    setDispItems(values);
  };

  const handleSaveDispatch = async (e) => {
    e.preventDefault();
    setFormError('');

    const validItems = dispItems.filter(item => item.stock_item !== '');
    if (validItems.length === 0) {
      setFormError('Please add at least one stock item.');
      return;
    }

    const payload = {
      order_number: dispNumber,
      destination: dispDestination,
      expected_delivery_date: new Date(dispExpectedDate).toISOString(),
      status: dispStatus,
      delivery_agent: dispAgent === '' ? null : parseInt(dispAgent),
      items: validItems.map(item => ({
        stock_item: parseInt(item.stock_item),
        quantity: parseInt(item.quantity)
      }))
    };

    try {
      await api.post('shipments/dispatches/', payload);
      setDispatchModalOpen(false);
      fetchData();
    } catch (err) {
      const errorMsg = err.response?.data?.status || err.response?.data?.order_number?.[0] || 'Failed to create Dispatch Order.';
      setFormError(errorMsg);
    }
  };

  const handleViewLogs = (logs) => {
    setActiveLogs(logs);
  };

  if (loading) {
    return (
      <div className="loading-container flex flex-col items-center justify-center h-screen bg-background">
        <div className="spinner"></div>
        <p className="text-muted-foreground text-sm">Loading shipping logs...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="font-outfit text-3xl font-bold text-foreground">Shipments & Shipments Log</h1>
          <p className="text-muted-foreground text-sm mt-1">Track goods receipt notes (inbound) and dispatches (outbound).</p>
        </div>
        
        {activeTab === 'inbound' ? (
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-5" onClick={openPoModal}>
            New Purchase Order
          </Button>
        ) : (
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-5" onClick={openDispatchModal}>
            Schedule Dispatch
          </Button>
        )}
      </div>

      {error && <div className="alert-danger p-4 rounded-lg bg-red-950/40 border border-red-900/50 text-red-400 text-sm">{error}</div>}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
        <TabsList className="bg-muted border border-border rounded-lg p-1 w-full max-w-[400px] flex gap-1">
          <TabsTrigger value="inbound" className="flex-1 text-sm font-semibold rounded-md py-2 data-[state=active]:bg-card data-[state=active]:text-foreground text-muted-foreground">
            Inbound (PO / GRN)
          </TabsTrigger>
          <TabsTrigger value="outbound" className="flex-1 text-sm font-semibold rounded-md py-2 data-[state=active]:bg-card data-[state=active]:text-foreground text-muted-foreground">
            Outbound (Dispatches)
          </TabsTrigger>
        </TabsList>

        {/* --- INBOUND TAB (PO / GRN LOGGING) --- */}
        <TabsContent value="inbound">
          <div className="panel-container border border-border bg-card p-6 rounded-xl space-y-6 shadow-lg">
            <div className="table-responsive rounded-xl border border-border overflow-hidden">
              <Table className="w-full text-left border-collapse">
                <TableHeader className="bg-accent/10 border-b border-border">
                  <TableRow>
                    <TableHead className="font-semibold text-xs text-muted-foreground uppercase py-4 px-6">PO Number</TableHead>
                    <TableHead className="font-semibold text-xs text-muted-foreground uppercase py-4 px-6">Supplier</TableHead>
                    <TableHead className="font-semibold text-xs text-muted-foreground uppercase py-4 px-6">Order Date</TableHead>
                    <TableHead className="font-semibold text-xs text-muted-foreground uppercase py-4 px-6">Expected Delivery</TableHead>
                    <TableHead className="font-semibold text-xs text-muted-foreground uppercase py-4 px-6">Status</TableHead>
                    <TableHead className="font-semibold text-xs text-muted-foreground uppercase py-4 px-6">Items Ordered</TableHead>
                    <TableHead className="font-semibold text-xs text-muted-foreground uppercase py-4 px-6 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-12 px-6">
                        No Purchase Orders logged in database.
                      </TableCell>
                    </TableRow>
                  ) : (
                    pos.map(po => {
                      const isPending = po.status === 'PENDING';
                      const isPartial = po.status === 'PARTIAL';
                      return (
                        <TableRow key={po.id} className="hover:bg-accent/10 border-b border-border last:border-none">
                          <TableCell className="font-semibold text-foreground py-4 px-6">{po.po_number}</TableCell>
                          <TableCell className="text-foreground py-4 px-6">{po.supplier}</TableCell>
                          <TableCell className="text-muted-foreground text-sm py-4 px-6">{new Date(po.order_date).toLocaleDateString()}</TableCell>
                          <TableCell className="text-muted-foreground text-sm py-4 px-6">
                            {po.expected_delivery_date ? new Date(po.expected_delivery_date).toLocaleDateString() : 'N/A'}
                          </TableCell>
                          <TableCell className="py-4 px-6">
                            <span className={`status-badge text-xs font-bold px-2 py-0.5 rounded ${
                              po.status === 'RECEIVED' ? 'success' : 
                              po.status === 'PARTIAL' ? 'warning' : 'danger'
                            }`}>
                              {po.status}
                            </span>
                          </TableCell>
                          <TableCell className="py-4 px-6">
                            <div className="text-xs text-muted-foreground space-y-1">
                              {po.items.map(item => (
                                <div key={item.id}>{item.stock_item_name} (x{item.quantity_ordered})</div>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell className="py-4 px-6 text-right">
                            {(isPending || isPartial) ? (
                              <Button 
                                className="bg-primary hover:bg-primary/95 text-primary-foreground font-semibold py-1 px-3 text-xs"
                                onClick={() => openGrnModal(po)}
                              >
                                Log GRN
                              </Button>
                            ) : (
                              <span className="text-xs italic text-muted-foreground">Fulfilled</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        {/* --- OUTBOUND TAB (DISPATCHES) --- */}
        <TabsContent value="outbound">
          <div className="panel-container border border-border bg-card p-6 rounded-xl space-y-6 shadow-lg">
            <div className="table-responsive rounded-xl border border-border overflow-hidden">
              <Table className="w-full text-left border-collapse">
                <TableHeader className="bg-accent/10 border-b border-border">
                  <TableRow>
                    <TableHead className="font-semibold text-xs text-muted-foreground uppercase py-4 px-6">Order Number</TableHead>
                    <TableHead className="font-semibold text-xs text-muted-foreground uppercase py-4 px-6">Destination</TableHead>
                    <TableHead className="font-semibold text-xs text-muted-foreground uppercase py-4 px-6">Delivery Date</TableHead>
                    <TableHead className="font-semibold text-xs text-muted-foreground uppercase py-4 px-6">Agent</TableHead>
                    <TableHead className="font-semibold text-xs text-muted-foreground uppercase py-4 px-6">Status</TableHead>
                    <TableHead className="font-semibold text-xs text-muted-foreground uppercase py-4 px-6">Items Included</TableHead>
                    <TableHead className="font-semibold text-xs text-muted-foreground uppercase py-4 px-6 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dispatches.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-12 px-6">
                        No dispatches scheduled in database.
                      </TableCell>
                    </TableRow>
                  ) : (
                    dispatches.map(disp => (
                      <TableRow key={disp.id} className="hover:bg-accent/10 border-b border-border last:border-none">
                        <TableCell className="font-semibold text-foreground py-4 px-6">{disp.order_number}</TableCell>
                        <TableCell className="text-foreground py-4 px-6">{disp.destination}</TableCell>
                        <TableCell className="py-4 px-6">
                          {disp.actual_delivery_date ? (
                            <div className="text-sm">
                              <span className="text-emerald-500 font-semibold">Delivered: </span>
                              {new Date(disp.actual_delivery_date).toLocaleDateString()}
                            </div>
                          ) : (
                            <div className="text-sm text-muted-foreground">
                              <span className="font-semibold text-muted">Expected: </span>
                              {new Date(disp.expected_delivery_date).toLocaleDateString()}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="py-4 px-6">
                          {disp.delivery_agent_detail ? (
                            <div>
                              <div className="font-semibold text-foreground">{disp.delivery_agent_detail.username}</div>
                              <div className="text-[10px] text-muted-foreground">{disp.delivery_agent_detail.phone || 'No Phone'}</div>
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
                          <div className="text-xs text-muted-foreground space-y-1">
                            {disp.items.map(item => (
                              <div key={item.id}>{item.stock_item_name} (x{item.quantity})</div>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="py-4 px-6 text-right">
                          <Button 
                            variant="outline" 
                            className="bg-accent border-border hover:bg-accent/80 text-foreground font-semibold py-1 px-3 text-xs"
                            onClick={() => handleViewLogs(disp.status_logs)}
                          >
                            Audit Logs
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* --- ADD NEW PURCHASE ORDER MODAL --- */}
      <Dialog open={poModalOpen} onOpenChange={setPoModalOpen}>
        <DialogContent className="bg-card border-border text-foreground max-w-[550px] p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-outfit text-xl font-bold">Create Purchase Order</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSavePo} className="space-y-4">
            {formError && <div className="alert-danger p-3 rounded bg-red-950/40 border border-red-900/50 text-red-400 text-xs">{formError}</div>}
            
            <div className="space-y-1.5">
              <Label htmlFor="po-no" className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">PO Number</Label>
              <Input 
                type="text" 
                id="po-no" 
                className="bg-accent/40 border-border" 
                value={poNumber}
                onChange={(e) => setPoNumber(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="po-supp" className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Supplier Name</Label>
              <Input 
                type="text" 
                id="po-supp" 
                className="bg-accent/40 border-border" 
                placeholder="e.g. Apex Supplier Ltd"
                value={poSupplier}
                onChange={(e) => setPoSupplier(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="po-date" className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Expected Delivery Date</Label>
              <Input 
                type="date" 
                id="po-date" 
                className="bg-accent/40 border-border" 
                value={poExpectedDate}
                onChange={(e) => setPoExpectedDate(e.target.value)}
              />
            </div>

            <div className="pt-4 border-t border-border space-y-4">
              <div className="flex justify-between items-center">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">PO Item List</Label>
                <Button type="button" variant="outline" className="bg-accent border-border hover:bg-accent/80 text-foreground py-1 px-3 h-8 text-xs font-semibold" onClick={addPoItemRow}>
                  Add Item
                </Button>
              </div>

              <div className="space-y-3 max-h-[160px] overflow-y-auto pr-1">
                {poItems.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-6 gap-2.5 items-center">
                    <div className="col-span-3">
                      <select
                        className="bg-accent/40 border border-border text-foreground rounded p-2 text-sm w-full"
                        value={item.stock_item}
                        onChange={(e) => handlePoItemChange(idx, 'stock_item', e.target.value)}
                        required
                      >
                        <option value="">Select Item...</option>
                        {stockItems.map(si => <option key={si.id} value={si.id}>{si.sku} - {si.name}</option>)}
                      </select>
                    </div>

                    <div className="col-span-2">
                      <Input
                        type="number"
                        className="bg-accent/40 border-border h-9"
                        min="1"
                        placeholder="Qty"
                        value={item.quantity_ordered}
                        onChange={(e) => handlePoItemChange(idx, 'quantity_ordered', e.target.value)}
                        required
                      />
                    </div>

                    <div className="col-span-1 text-center">
                      {poItems.length > 1 && (
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" title="Delete" onClick={() => removePoItemRow(idx)}>
                          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter className="pt-4 border-t border-border gap-2">
              <Button type="button" variant="outline" className="bg-accent border-border hover:bg-accent/80 text-foreground" onClick={() => setPoModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-primary text-primary-foreground font-semibold">
                Generate PO
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* --- LOG GOODS RECEIPT NOTE (GRN) MODAL --- */}
      <Dialog open={grnModalOpen} onOpenChange={setGrnModalOpen}>
        <DialogContent className="bg-card border-border text-foreground max-w-[550px] p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-outfit text-xl font-bold">Log Goods Receipt Note (GRN)</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSaveGrn} className="space-y-4">
            {formError && <div className="alert-danger p-3 rounded bg-red-950/40 border border-red-900/50 text-red-400 text-xs whitespace-pre-line">{formError}</div>}
            
            <div className="grid grid-cols-2 gap-4 pb-3 border-b border-border">
              <div>
                <Label className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wider">Purchase Order</Label>
                <div className="font-bold text-foreground mt-0.5">{selectedPo?.po_number}</div>
              </div>
              <div>
                <Label className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wider">Supplier</Label>
                <div className="text-foreground mt-0.5">{selectedPo?.supplier}</div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="grn-no" className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">GRN Reference Number</Label>
              <Input 
                type="text" 
                id="grn-no" 
                className="bg-accent/40 border-border" 
                value={grnNumber}
                onChange={(e) => setGrnNumber(e.target.value)}
                required
              />
            </div>

            <div className="pt-4 border-t border-border space-y-3">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Confirm Received Quantities</Label>
              
              <div className="space-y-3 max-h-[160px] overflow-y-auto pr-1">
                {grnItems.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center p-3 bg-accent/10 border border-border/80 rounded-lg">
                    <div>
                      <div className="font-semibold text-sm text-foreground">{item.stock_item_name}</div>
                      <div className="text-[10px] text-muted-foreground">SKU: {item.stock_item_sku}</div>
                    </div>
                    
                    <div className="w-[100px]">
                      <Input
                        type="number"
                        className="bg-accent/40 border-border h-9"
                        min="0"
                        value={item.quantity_received}
                        onChange={(e) => handleGrnItemChange(idx, e.target.value)}
                        required
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter className="pt-4 border-t border-border gap-2">
              <Button type="button" variant="outline" className="bg-accent border-border hover:bg-accent/80 text-foreground" onClick={() => setGrnModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-primary text-primary-foreground font-semibold">
                Register Receipt
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* --- CREATE OUTBOUND DISPATCH ORDER MODAL --- */}
      <Dialog open={dispatchModalOpen} onOpenChange={setDispatchModalOpen}>
        <DialogContent className="bg-card border-border text-foreground max-w-[550px] p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-outfit text-xl font-bold">Create Outbound Dispatch</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSaveDispatch} className="space-y-4">
            {formError && <div className="alert-danger p-3 rounded bg-red-950/40 border border-red-900/50 text-red-400 text-xs whitespace-pre-line">{formError}</div>}
            
            <div className="space-y-1.5">
              <Label htmlFor="disp-no" className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Dispatch Order Number</Label>
              <Input 
                type="text" 
                id="disp-no" 
                className="bg-accent/40 border-border" 
                value={dispNumber}
                onChange={(e) => setDispNumber(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="disp-dest" className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Destination Address</Label>
              <Input 
                type="text" 
                id="disp-dest" 
                className="bg-accent/40 border-border" 
                placeholder="e.g. Retail Store #10, Los Angeles"
                value={dispDestination}
                onChange={(e) => setDispDestination(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="disp-date" className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Expected Delivery Date</Label>
                <Input 
                  type="date" 
                  id="disp-date" 
                  className="bg-accent/40 border-border" 
                  value={dispExpectedDate}
                  onChange={(e) => setDispExpectedDate(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="disp-agent" className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Assign Delivery Agent</Label>
                <select
                  id="disp-agent"
                  className="bg-accent/40 border border-border text-foreground rounded p-2.5 text-sm w-full"
                  value={dispAgent}
                  onChange={(e) => setDispAgent(e.target.value)}
                >
                  <option value="">Unassigned</option>
                  {agents.map(a => <option key={a.id} value={a.id}>{a.username} ({a.phone || 'No Phone'})</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="disp-stat" className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Initial Status</Label>
              <select
                id="disp-stat"
                className="bg-accent/40 border border-border text-foreground rounded p-2.5 text-sm w-full"
                value={dispStatus}
                onChange={(e) => setDispStatus(e.target.value)}
              >
                <option value="PENDING">Pending Assignment</option>
                <option value="DISPATCHED">Dispatched (Subtracts Stock Immediately)</option>
              </select>
            </div>

            <div className="pt-4 border-t border-border space-y-4">
              <div className="flex justify-between items-center">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Items to Ship</Label>
                <Button type="button" variant="outline" className="bg-accent border-border hover:bg-accent/80 text-foreground py-1 px-3 h-8 text-xs font-semibold" onClick={addDispItemRow}>
                  Add Item
                </Button>
              </div>

              <div className="space-y-3 max-h-[160px] overflow-y-auto pr-1">
                {dispItems.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-6 gap-2.5 items-center">
                    <div className="col-span-3">
                      <select
                        className="bg-accent/40 border border-border text-foreground rounded p-2 text-sm w-full"
                        value={item.stock_item}
                        onChange={(e) => handleDispItemChange(idx, 'stock_item', e.target.value)}
                        required
                      >
                        <option value="">Select Item...</option>
                        {stockItems.map(si => (
                          <option key={si.id} value={si.id}>
                            {si.sku} - {si.name} (In stock: {si.quantity})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-span-2">
                      <Input
                        type="number"
                        className="bg-accent/40 border-border h-9"
                        min="1"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => handleDispItemChange(idx, 'quantity', e.target.value)}
                        required
                      />
                    </div>

                    <div className="col-span-1 text-center">
                      {dispItems.length > 1 && (
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" title="Delete" onClick={() => removeDispItemRow(idx)}>
                          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter className="pt-4 border-t border-border gap-2">
              <Button type="button" variant="outline" className="bg-accent border-border hover:bg-accent/80 text-foreground" onClick={() => setDispatchModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-primary text-primary-foreground font-semibold">
                Generate Order
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

export default Shipments;
