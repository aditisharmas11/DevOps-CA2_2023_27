import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';

const Inventory = () => {
  const [activeTab, setActiveTab] = useState('items'); // 'items' or 'zones'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Data lists
  const [items, setItems] = useState([]);
  const [zones, setZones] = useState([]);
  const [categories, setCategories] = useState([]);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedZone, setSelectedZone] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  // Modals state
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [zoneModalOpen, setZoneModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editingZone, setEditingZone] = useState(null);
  
  // Form input states (Stock Item)
  const [itemSku, setItemSku] = useState('');
  const [itemName, setItemName] = useState('');
  const [itemCategory, setItemCategory] = useState('');
  const [itemQuantity, setItemQuantity] = useState(0);
  const [itemWeight, setItemWeight] = useState(0.0);
  const [itemThreshold, setItemThreshold] = useState(10);
  const [itemZone, setItemZone] = useState('');

  // Form input states (Warehouse Zone)
  const [zoneCode, setZoneCode] = useState('');
  const [zoneName, setZoneName] = useState('');
  const [zoneCapacity, setZoneCapacity] = useState(0.0);
  const [zoneDesc, setZoneDesc] = useState('');

  const [formError, setFormError] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [itemsRes, zonesRes] = await Promise.all([
        api.get('inventory/items/'),
        api.get('inventory/zones/'),
      ]);
      setItems(itemsRes.data);
      setZones(zonesRes.data);

      // Extract unique categories from items
      const uniqueCats = [...new Set(itemsRes.data.map(item => item.category))];
      setCategories(uniqueCats);
    } catch (err) {
      setError('Failed to fetch inventory records.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // --- ITEM MODAL HANDLERS ---
  const openItemModal = (item = null) => {
    setFormError('');
    if (item) {
      setEditingItem(item);
      setItemSku(item.sku);
      setItemName(item.name);
      setItemCategory(item.category);
      setItemQuantity(item.quantity);
      setItemWeight(item.unit_weight);
      setItemThreshold(item.low_stock_threshold);
      setItemZone(item.warehouse_zone || '');
    } else {
      setEditingItem(null);
      setItemSku('');
      setItemName('');
      setItemCategory('');
      setItemQuantity(0);
      setItemWeight(0.0);
      setItemThreshold(10);
      setItemZone('');
    }
    setItemModalOpen(true);
  };

  const handleSaveItem = async (e) => {
    e.preventDefault();
    setFormError('');
    const payload = {
      sku: itemSku,
      name: itemName,
      category: itemCategory,
      quantity: parseInt(itemQuantity),
      unit_weight: parseFloat(itemWeight),
      low_stock_threshold: parseInt(itemThreshold),
      warehouse_zone: itemZone === '' ? null : parseInt(itemZone),
    };

    try {
      if (editingItem) {
        await api.put(`inventory/items/${editingItem.id}/`, payload);
      } else {
        await api.post('inventory/items/', payload);
      }
      setItemModalOpen(false);
      fetchData();
    } catch (err) {
      const errorData = err.response?.data;
      if (typeof errorData === 'object') {
        const errorMsg = Object.entries(errorData)
          .map(([key, val]) => `${key.replace('_', ' ')}: ${val}`)
          .join('\n');
        setFormError(errorMsg || 'Failed to save item.');
      } else {
        setFormError('Failed to save stock item.');
      }
    }
  };

  const handleDeleteItem = async (itemId) => {
    if (!window.confirm('Are you sure you want to delete this stock item?')) return;
    try {
      await api.delete(`inventory/items/${itemId}/`);
      fetchData();
    } catch (err) {
      alert('Failed to delete item.');
    }
  };

  // --- ZONE MODAL HANDLERS ---
  const openZoneModal = (zone = null) => {
    setFormError('');
    if (zone) {
      setEditingZone(zone);
      setZoneCode(zone.code);
      setZoneName(zone.name);
      setZoneCapacity(zone.max_weight_capacity);
      setZoneDesc(zone.description || '');
    } else {
      setEditingZone(null);
      setZoneCode('');
      setZoneName('');
      setZoneCapacity(0.0);
      setZoneDesc('');
    }
    setZoneModalOpen(true);
  };

  const handleSaveZone = async (e) => {
    e.preventDefault();
    setFormError('');
    const payload = {
      code: zoneCode,
      name: zoneName,
      max_weight_capacity: parseFloat(zoneCapacity),
      description: zoneDesc,
    };

    try {
      if (editingZone) {
        await api.put(`inventory/zones/${editingZone.id}/`, payload);
      } else {
        await api.post('inventory/zones/', payload);
      }
      setZoneModalOpen(false);
      fetchData();
    } catch (err) {
      const errorData = err.response?.data;
      if (typeof errorData === 'object') {
        const errorMsg = Object.entries(errorData)
          .map(([key, val]) => `${key}: ${val}`)
          .join('\n');
        setFormError(errorMsg || 'Failed to save zone.');
      } else {
        setFormError('Failed to save zone.');
      }
    }
  };

  const handleDeleteZone = async (zoneId) => {
    if (!window.confirm('Deleting a zone will set all its assigned items to unassigned. Proceed?')) return;
    try {
      await api.delete(`inventory/zones/${zoneId}/`);
      fetchData();
    } catch (err) {
      alert('Failed to delete zone.');
    }
  };

  // --- FILTER & SEARCH IMPLEMENTATION ---
  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.sku.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesZone = selectedZone === '' || item.warehouse_zone === parseInt(selectedZone);
    const matchesCategory = selectedCategory === '' || item.category === selectedCategory;
    return matchesSearch && matchesZone && matchesCategory;
  });

  if (loading) {
    return (
      <div className="loading-container flex flex-col items-center justify-center h-screen bg-background">
        <div className="spinner"></div>
        <p className="text-muted-foreground text-sm">Loading inventory metrics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="font-outfit text-3xl font-bold text-foreground">Inventory Management</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage warehouse layouts and track stock quantities.</p>
        </div>
        
        {activeTab === 'items' ? (
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-5" onClick={() => openItemModal()}>
            Add Stock Item
          </Button>
        ) : (
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-5" onClick={() => openZoneModal()}>
            Add Storage Zone
          </Button>
        )}
      </div>

      {error && <div className="alert-danger p-4 rounded-lg bg-red-950/40 border border-red-900/50 text-red-400 text-sm">{error}</div>}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
        <TabsList className="bg-muted border border-border rounded-lg p-1 w-full max-w-[400px] flex gap-1">
          <TabsTrigger value="items" className="flex-1 text-sm font-semibold rounded-md py-2 data-[state=active]:bg-card data-[state=active]:text-foreground text-muted-foreground">
            Stock Items
          </TabsTrigger>
          <TabsTrigger value="zones" className="flex-1 text-sm font-semibold rounded-md py-2 data-[state=active]:bg-card data-[state=active]:text-foreground text-muted-foreground">
            Warehouse Zones
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: STOCK ITEMS PANEL */}
        <TabsContent value="items">
          <div className="panel-container border border-border bg-card p-6 rounded-xl space-y-6 shadow-lg">
            {/* Filters controls row */}
            <div className="flex flex-col md:flex-row gap-4 items-center w-full">
              <Input 
                type="text" 
                className="bg-accent/40 border-border text-foreground search-input flex-1 placeholder:text-muted-foreground" 
                placeholder="Search name or SKU..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              
              <select 
                className="select-filter bg-accent/40 border border-border text-foreground rounded-lg p-2.5 text-sm w-full md:w-[200px]"
                value={selectedZone}
                onChange={(e) => setSelectedZone(e.target.value)}
              >
                <option value="">All Zones</option>
                {zones.map(z => <option key={z.id} value={z.id}>{z.code}</option>)}
              </select>

              <select 
                className="select-filter bg-accent/40 border border-border text-foreground rounded-lg p-2.5 text-sm w-full md:w-[200px]"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="">All Categories</option>
                {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>

            {/* Table */}
            <div className="table-responsive rounded-xl border border-border overflow-hidden">
              <Table className="w-full text-left border-collapse">
                <TableHeader className="bg-accent/10 border-b border-border">
                  <TableRow>
                    <TableHead className="font-semibold text-xs text-muted-foreground uppercase py-4 px-6">SKU</TableHead>
                    <TableHead className="font-semibold text-xs text-muted-foreground uppercase py-4 px-6">Item Name</TableHead>
                    <TableHead className="font-semibold text-xs text-muted-foreground uppercase py-4 px-6">Category</TableHead>
                    <TableHead className="font-semibold text-xs text-muted-foreground uppercase py-4 px-6">Stock Qty</TableHead>
                    <TableHead className="font-semibold text-xs text-muted-foreground uppercase py-4 px-6">Unit Weight</TableHead>
                    <TableHead className="font-semibold text-xs text-muted-foreground uppercase py-4 px-6">Zone</TableHead>
                    <TableHead className="font-semibold text-xs text-muted-foreground uppercase py-4 px-6">Alert Level</TableHead>
                    <TableHead className="font-semibold text-xs text-muted-foreground uppercase py-4 px-6 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-12 px-6">
                        No stock items match the active filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredItems.map(item => {
                      const isLow = item.quantity <= item.low_stock_threshold;
                      return (
                        <TableRow key={item.id} className="hover:bg-accent/10 border-b border-border last:border-none">
                          <TableCell className="font-semibold text-muted-foreground py-4 px-6">{item.sku}</TableCell>
                          <TableCell className="font-semibold text-foreground py-4 px-6">{item.name}</TableCell>
                          <TableCell className="text-muted-foreground text-sm py-4 px-6">{item.category}</TableCell>
                          <TableCell className="text-foreground py-4 px-6">{item.quantity} units</TableCell>
                          <TableCell className="text-foreground py-4 px-6">{item.unit_weight} kg</TableCell>
                          <TableCell className="py-4 px-6">
                            {item.warehouse_zone_code ? (
                              <span className="zone-code-badge text-xs px-2.5 py-0.5 rounded">
                                {item.warehouse_zone_code}
                              </span>
                            ) : (
                              <span className="italic text-muted-foreground text-xs">Unassigned</span>
                            )}
                          </TableCell>
                          <TableCell className="py-4 px-6">
                            <span className={`status-badge text-xs font-bold px-2 py-0.5 rounded ${isLow ? 'danger' : 'success'}`}>
                              {isLow ? 'Low Stock' : 'Healthy'}
                            </span>
                          </TableCell>
                          <TableCell className="py-4 px-6 text-right">
                            <div className="flex gap-2 justify-end">
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:bg-primary/10" title="Edit" onClick={() => openItemModal(item)}>
                                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" title="Delete" onClick={() => handleDeleteItem(item.id)}>
                                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                              </Button>
                            </div>
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

        {/* TAB 2: WAREHOUSE ZONES PANEL */}
        <TabsContent value="zones">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {zones.length === 0 ? (
              <Card className="col-span-full border-border bg-card text-center p-12 shadow-lg">
                <CardContent>
                  <p className="text-muted-foreground text-sm">No warehouse zones mapped yet.</p>
                </CardContent>
              </Card>
            ) : (
              zones.map(zone => {
                const capUsed = zone.occupancy_rate;
                const isOverloaded = capUsed > 90;
                const isWarning = capUsed > 70 && capUsed <= 90;

                return (
                  <Card key={zone.id} className="border-border bg-card shadow-lg p-6 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <div className="zone-code-badge text-xs font-bold px-2 py-0.5 rounded">{zone.code}</div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:bg-primary/10" title="Edit" onClick={() => openZoneModal(zone)}>
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" title="Delete" onClick={() => handleDeleteZone(zone.id)}>
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                          </Button>
                        </div>
                      </div>
                      
                      <h3 className="font-outfit text-lg font-semibold text-foreground">{zone.name}</h3>
                      <p className="text-muted-foreground text-xs h-10 overflow-hidden line-clamp-2 mt-2 leading-relaxed">
                        {zone.description || 'No description provided.'}
                      </p>
                    </div>

                    <div className="mt-6 space-y-2">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Used: {zone.current_weight} kg / {zone.max_weight_capacity} kg</span>
                        <strong className={isOverloaded ? 'text-red-500' : isWarning ? 'text-amber-500' : 'text-emerald-500'}>
                          {capUsed}%
                        </strong>
                      </div>
                      <Progress 
                        value={capUsed} 
                        className="h-2 bg-secondary"
                        indicatorClassName={isOverloaded ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'}
                      />
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* --- ADD/EDIT STOCK ITEM MODAL --- */}
      <Dialog open={itemModalOpen} onOpenChange={setItemModalOpen}>
        <DialogContent className="bg-card border-border text-foreground max-w-[500px] p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-outfit text-xl font-bold">
              {editingItem ? 'Edit Stock Item' : 'Add New Stock Item'}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSaveItem} className="space-y-5">
            {formError && <div className="alert-danger p-3 rounded bg-red-950/40 border border-red-900/50 text-red-400 text-xs whitespace-pre-line">{formError}</div>}
            
            <div className="space-y-2">
              <Label htmlFor="item-sku" className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">SKU Code</Label>
              <Input 
                type="text" 
                id="item-sku" 
                className="bg-accent/40 border-border" 
                placeholder="e.g. SKU-ELEC-24"
                value={itemSku}
                onChange={(e) => setItemSku(e.target.value)}
                disabled={!!editingItem}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="item-name" className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Item Name</Label>
              <Input 
                type="text" 
                id="item-name" 
                className="bg-accent/40 border-border" 
                placeholder="e.g. Vapor Display 27"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="item-cat" className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Category</Label>
                <Input 
                  type="text" 
                  id="item-cat" 
                  className="bg-accent/40 border-border" 
                  placeholder="e.g. Electronics"
                  value={itemCategory}
                  onChange={(e) => setItemCategory(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="item-zone" className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Warehouse Zone</Label>
                <select 
                  id="item-zone" 
                  className="bg-accent/40 border border-border text-foreground rounded-lg p-2.5 text-sm w-full"
                  value={itemZone}
                  onChange={(e) => setItemZone(e.target.value)}
                >
                  <option value="">Unassigned</option>
                  {zones.map(z => <option key={z.id} value={z.id}>{z.code} - {z.name}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="item-qty" className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Quantity</Label>
                <Input 
                  type="number" 
                  id="item-qty" 
                  className="bg-accent/40 border-border" 
                  min="0"
                  value={itemQuantity}
                  onChange={(e) => setItemQuantity(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="item-w" className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Weight (kg)</Label>
                <Input 
                  type="number" 
                  id="item-w" 
                  className="bg-accent/40 border-border" 
                  step="0.01"
                  min="0.01"
                  value={itemWeight}
                  onChange={(e) => setItemWeight(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="item-thresh" className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Alert Limit</Label>
                <Input 
                  type="number" 
                  id="item-thresh" 
                  className="bg-accent/40 border-border" 
                  min="1"
                  value={itemThreshold}
                  onChange={(e) => setItemThreshold(e.target.value)}
                  required
                />
              </div>
            </div>

            <DialogFooter className="pt-4 border-t border-border gap-2">
              <Button type="button" variant="outline" className="bg-accent border-border hover:bg-accent/80 text-foreground" onClick={() => setItemModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-primary text-primary-foreground font-semibold">
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* --- ADD/EDIT STORAGE ZONE MODAL --- */}
      <Dialog open={zoneModalOpen} onOpenChange={setZoneModalOpen}>
        <DialogContent className="bg-card border-border text-foreground max-w-[500px] p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-outfit text-xl font-bold">
              {editingZone ? 'Edit Storage Zone' : 'Add New Storage Zone'}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSaveZone} className="space-y-5">
            {formError && <div className="alert-danger p-3 rounded bg-red-950/40 border border-red-900/50 text-red-400 text-xs">{formError}</div>}
            
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="zone-c" className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Zone Code</Label>
                <Input 
                  type="text" 
                  id="zone-c" 
                  className="bg-accent/40 border-border" 
                  placeholder="ZONE-A"
                  value={zoneCode}
                  onChange={(e) => setZoneCode(e.target.value)}
                  disabled={!!editingZone}
                  required
                />
              </div>

              <div className="col-span-2 space-y-2">
                <Label htmlFor="zone-n" className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Zone Name</Label>
                <Input 
                  type="text" 
                  id="zone-n" 
                  className="bg-accent/40 border-border" 
                  placeholder="Cold Storage Area"
                  value={zoneName}
                  onChange={(e) => setZoneName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="zone-cap" className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Max Weight Capacity (kg)</Label>
              <Input 
                type="number" 
                id="zone-cap" 
                className="bg-accent/40 border-border" 
                placeholder="5000.00"
                step="0.01"
                min="1.0"
                value={zoneCapacity}
                onChange={(e) => setZoneCapacity(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="zone-d" className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Description</Label>
              <textarea 
                id="zone-d" 
                className="bg-accent/40 border border-border text-foreground rounded-lg p-2.5 text-sm w-full focus:outline-none focus:border-primary" 
                placeholder="Describe zone items limits or locations..."
                rows="3"
                value={zoneDesc}
                onChange={(e) => setZoneDesc(e.target.value)}
              />
            </div>

            <DialogFooter className="pt-4 border-t border-border gap-2">
              <Button type="button" variant="outline" className="bg-accent border-border hover:bg-accent/80 text-foreground" onClick={() => setZoneModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-primary text-primary-foreground font-semibold">
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Inventory;
