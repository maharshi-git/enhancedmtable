sap.ui.define([
    "sap/ui/core/Control",
    "sap/m/VBox",
    "sap/m/Table",
    "sap/m/Column",
    "sap/m/Text",
    "sap/m/ColumnListItem",
    "sap/m/Toolbar",
    "sap/m/SearchField",
    "sap/m/Button",
    "sap/m/ToolbarSpacer",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/SelectDialog",
    "sap/m/StandardListItem"
], function (Control, VBox, Table, Column, Text, ColumnListItem, Toolbar, SearchField, Button, ToolbarSpacer, JSONModel, Filter, FilterOperator, SelectDialog, StandardListItem) {
    "use strict";

    return Control.extend("customtableapp.control.EnhancedTable", {
        metadata: {
            properties: {
                data: { type: "object[]", defaultValue: [] },
                visibleRows: { type: "int", defaultValue: 10 }
            },
            events: {
                rowPress: {
                    parameters: {
                        selectedObject: { type: "object" },
                        selectedId: { type: "string" }
                    }
                }
            },
            aggregations: {
                _layout: { type: "sap.m.VBox", multiple: false, visibility: "hidden" }
            }
        },

        init: function () {
            // Internal model
            this._oModel = new JSONModel({
                items: [],
                columns: []
            });
            this.setModel(this._oModel, "internal");

            var oSearchField = new SearchField({
                liveChange: this._onSearch.bind(this),
                width: "20rem"
            });

            var oSettingsBtn = new Button({
                icon: "sap-icon://action-settings",
                press: this._onOpenSettings.bind(this),
                tooltip: "Select Columns"
            });

            var oToolbar = new Toolbar({
                content: [
                    oSearchField,
                    new ToolbarSpacer(),
                    oSettingsBtn
                ]
            });

            this._oTable = new Table({
                growing: true,
                growingThreshold: this.getVisibleRows(),
                growingScrollToLoad: true,
                fixedLayout: false,
                mode: "SingleSelectMaster",
                selectionChange: this._onRowPress.bind(this),
                headerToolbar: oToolbar
            });

            var oVBox = new VBox({
                items: [this._oTable]
            });

            this.setAggregation("_layout", oVBox);
        },

        setData: function (aData) {
            this.setProperty("data", aData, true);
            this._refreshTableState(aData);
        },

        setVisibleRows: function (iRows) {
            this.setProperty("visibleRows", iRows, true);
            if (this._oTable) {
                this._oTable.setGrowingThreshold(iRows);
            }
        },

        _refreshTableState: function (aData) {
            if (!aData || aData.length === 0) {
                this._oModel.setProperty("/items", []);
                this._oModel.setProperty("/columns", []);
                return;
            }

            var aAllKeys = Object.keys(aData[0]);
            var aVisibleKeys = aAllKeys.slice(0, 6);

            var aColumns = aAllKeys.map(function (sKey) {
                return {
                    name: sKey,
                    visible: aVisibleKeys.includes(sKey)
                };
            });

            this._oModel.setProperty("/columns", aColumns);
            this._oModel.setProperty("/items", aData);
            this._oModel.setProperty("/allKeys", aAllKeys);

            this._bindTableColumns();
            this._bindTableItems();
        },

        _bindTableColumns: function () {
            var aColumnsData = this._oModel.getProperty("/columns");
            this._oTable.destroyColumns();

            aColumnsData.forEach(function (oCol) {
                if (oCol.visible) {
                    var oColumn = new Column({
                        header: new Text({ text: oCol.name })
                    });
                    this._oTable.addColumn(oColumn);
                }
            }.bind(this));
        },

        _bindTableItems: function () {
            var aColumnsData = this._oModel.getProperty("/columns");
            var aVisibleCols = aColumnsData.filter(function (c) { return c.visible; }).map(function (c) { return c.name; });

            var oTemplate = new ColumnListItem({
                type: "Active",
                cells: aVisibleCols.map(function (sKey) {
                    return new Text({ text: "{internal>" + sKey + "}" });
                })
            });

            this._oTable.unbindItems();
            this._oTable.bindItems({
                path: "internal>/items",
                template: oTemplate
            });
        },

        _onSearch: function (oEvent) {
            var sQuery = oEvent.getParameter("newValue");
            var oBinding = this._oTable.getBinding("items");
            if (!oBinding) return;

            if (sQuery && sQuery.length > 0) {
                var sQueryLower = sQuery.toLowerCase();
                var aVisibleCols = this._oModel.getProperty("/columns").filter(function (c) { return c.visible; }).map(function (c) { return c.name; });

                var oCustomFilter = new Filter({
                    path: "",
                    test: function (oValue) {
                        if (!oValue) return false;
                        for (var i = 0; i < aVisibleCols.length; i++) {
                            var sKey = aVisibleCols[i];
                            var vVal = oValue[sKey];
                            if (vVal !== null && vVal !== undefined) {
                                if (String(vVal).toLowerCase().indexOf(sQueryLower) !== -1) {
                                    return true;
                                }
                            }
                        }
                        return false;
                    }
                });

                oBinding.filter([oCustomFilter], "Application");
            } else {
                oBinding.filter([]);
            }
        },

        _onOpenSettings: function () {
            if (!this._oSelectDialog) {
                this._oSelectDialog = new SelectDialog({
                    title: "Select Columns",
                    multiSelect: true,
                    confirm: this._onSettingsConfirm.bind(this),
                    search: function (oEvent) {
                        var sValue = oEvent.getParameter("value");
                        var oFilter = new Filter("name", FilterOperator.Contains, sValue);
                        oEvent.getSource().getBinding("items").filter([oFilter]);
                    }
                });

                this._oSelectDialog.bindAggregation("items", {
                    path: "internal>/columns",
                    template: new StandardListItem({
                        title: "{internal>name}",
                        selected: "{internal>visible}"
                    })
                });
                this.addDependent(this._oSelectDialog);
            }

            var aColumnsData = this._oModel.getProperty("/columns");
            var aItems = this._oSelectDialog.getItems();
            aItems.forEach(function (oItem, index) {
                oItem.setSelected(aColumnsData[index].visible);
            });

            this._oSelectDialog.open();
        },

        _onSettingsConfirm: function (oEvent) {
            var aContexts = oEvent.getParameter("selectedContexts");
            if (aContexts) {
                var aColumnsData = this._oModel.getProperty("/columns");
                var aSelectedNames = aContexts.map(function (ctx) { return ctx.getObject().name; });

                aColumnsData.forEach(function (oCol) {
                    oCol.visible = aSelectedNames.includes(oCol.name);
                });

                this._oModel.setProperty("/columns", aColumnsData);
                this._bindTableColumns();
                this._bindTableItems();
            }
        },

        _onRowPress: function (oEvent) {
            var oItem = oEvent.getParameter("listItem");
            var oContext = oItem.getBindingContext("internal");
            var oSelectedObj = oContext.getObject();

            this.fireRowPress({
                selectedObject: oSelectedObj,
                selectedId: oSelectedObj.id || oSelectedObj.ID || oContext.getPath().split('/').pop()
            });

            this._oTable.removeSelections(true);
        },

        renderer: function (oRm, oControl) {
            oRm.openStart("div", oControl);
            oRm.openEnd();
            oRm.renderControl(oControl.getAggregation("_layout"));
            oRm.close("div");
        }
    });

});
