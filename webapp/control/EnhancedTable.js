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
    "sap/m/StandardListItem",
    "sap/m/NavContainer",
    "sap/m/Page",
    "sap/ui/layout/form/SimpleForm",
    "sap/m/Label"
], function (Control, VBox, Table, Column, Text, ColumnListItem, Toolbar, SearchField, Button, ToolbarSpacer, JSONModel, Filter, FilterOperator, SelectDialog, StandardListItem, NavContainer, Page, SimpleForm, Label) {
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

            var oExportBtn = new Button({
                icon: "sap-icon://excel-attachment",
                press: this._onExportExcel.bind(this),
                tooltip: "Export to CSV"
            });

            var oToolbar = new Toolbar({
                content: [
                    oSearchField,
                    new ToolbarSpacer(),
                    oExportBtn,
                    oSettingsBtn
                ]
            });

            this._oTable = new Table({
                growing: false,
                fixedLayout: false,
                mode: "SingleSelectMaster",
                selectionChange: this._onRowPress.bind(this),
                headerToolbar: oToolbar
            });

            this._oPaginationBar = new sap.m.OverflowToolbar({
                content: [
                    new sap.m.ToolbarSpacer(),
                    new sap.m.Button({
                        id: this.getId() + "-btnPrev",
                        icon: "sap-icon://navigation-left-arrow",
                        press: this._onPrevPage.bind(this)
                    }),
                    new sap.m.Text({
                        id: this.getId() + "-pageInfo",
                        text: "Page 1 of 1"
                    }),
                    new sap.m.Button({
                        id: this.getId() + "-btnNext",
                        icon: "sap-icon://navigation-right-arrow",
                        press: this._onNextPage.bind(this)
                    }),
                    new sap.m.ToolbarSpacer()
                ]
            });

            // Pagination state
            this._iCurrentPage = 1;
            this._iTotalPages = 1;

            this._oTablePage = new Page({
                showHeader: false,
                content: [this._oTable, this._oPaginationBar]
            });

            this._oForm = new SimpleForm({
                editable: false,
                layout: "ResponsiveGridLayout",
                title: "All Values",
                columnsM: 2,
                columnsL: 3,
                columnsXL: 4
            });

            this._oDetailPage = new Page({
                title: "Object Details",
                showNavButton: true,
                navButtonPress: this._onNavBack.bind(this),
                content: [this._oForm]
            });

            this._oNavContainer = new NavContainer({
                height: "40rem",
                pages: [this._oTablePage, this._oDetailPage]
            });

            var oVBox = new VBox({
                items: [this._oNavContainer]
            });

            this.setAggregation("_layout", oVBox);
        },

        setData: function (aData) {
            this.setProperty("data", aData, true);
            this._refreshTableState(aData);
        },

        setVisibleRows: function (iRows) {
            this.setProperty("visibleRows", iRows, true);
            this._updatePagination();
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

            this._iCurrentPage = 1;

            this._bindTableColumns();
            this._updatePagination();

            // Auto-navigate to details if only 1 item exists
            if (aData.length === 1) {
                this._openDetailForObject(aData[0]);
            }
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
                path: "internal>/pagedItems",
                template: oTemplate
            });
        },

        _updatePagination: function () {
            var aAllItems = this._oModel.getProperty("/items") || [];

            // Apply current filters if any
            var oBinding = this._oTable.getBinding("items");
            if (this._aCurrentFilters && this._aCurrentFilters.length > 0) {
                var aFiltered = aAllItems.filter(function (oItem) {
                    var match = false;
                    this._aCurrentFilters.forEach(function (oFilter) {
                        if (oFilter.fnTest(oItem)) match = true;
                    });
                    return match;
                }.bind(this));
                aAllItems = aFiltered;
            }

            var iVisibleRows = this.getVisibleRows();
            this._iTotalPages = Math.ceil(aAllItems.length / iVisibleRows) || 1;

            if (this._iCurrentPage > this._iTotalPages) {
                this._iCurrentPage = 1;
            }

            var sInfoText = "Page " + this._iCurrentPage + " of " + this._iTotalPages;
            sap.ui.getCore().byId(this.getId() + "-pageInfo").setText(sInfoText);

            sap.ui.getCore().byId(this.getId() + "-btnPrev").setEnabled(this._iCurrentPage > 1);
            sap.ui.getCore().byId(this.getId() + "-btnNext").setEnabled(this._iCurrentPage < this._iTotalPages);

            var iStartIndex = (this._iCurrentPage - 1) * iVisibleRows;
            var aPagedData = aAllItems.slice(iStartIndex, iStartIndex + iVisibleRows);

            this._oModel.setProperty("/pagedItems", aPagedData);
            this._bindTableItems();
        },

        _onPrevPage: function () {
            if (this._iCurrentPage > 1) {
                this._iCurrentPage--;
                this._updatePagination();
            }
        },

        _onNextPage: function () {
            if (this._iCurrentPage < this._iTotalPages) {
                this._iCurrentPage++;
                this._updatePagination();
            }
        },

        _onSearch: function (oEvent) {
            var sQuery = oEvent.getParameter("newValue");
            this._iCurrentPage = 1; // reset on search

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

                this._aCurrentFilters = [oCustomFilter];
            } else {
                this._aCurrentFilters = [];
            }

            this._updatePagination();
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

        _onExportExcel: function () {
            var aItems = this._oModel.getProperty("/items");
            if (!aItems || aItems.length === 0) return;

            var aColumnsData = this._oModel.getProperty("/columns");
            var aVisibleCols = aColumnsData.filter(function (c) { return c.visible; }).map(function (c) { return c.name; });

            // CSV Header
            var sCsv = aVisibleCols.join(",") + "\n";

            // CSV Rows
            aItems.forEach(function (oItem) {
                var aRowData = aVisibleCols.map(function (sKey) {
                    var sVal = oItem[sKey] !== null && oItem[sKey] !== undefined ? String(oItem[sKey]) : "";
                    if (sVal.indexOf(",") > -1 || sVal.indexOf('"') > -1) {
                        sVal = '"' + sVal.replace(/"/g, '""') + '"';
                    }
                    return sVal;
                });
                sCsv += aRowData.join(",") + "\n";
            });

            var blob = new window.Blob([sCsv], { type: "text/csv;charset=utf-8;" });
            var link = document.createElement("a");
            var url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", "Export.csv");
            link.style.visibility = "hidden";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
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

        _openDetailForObject: function (oSelectedObj) {
            this._oForm.removeAllContent();
            var that = this;
            Object.keys(oSelectedObj).forEach(function (sKey) {
                that._oForm.addContent(new Label({ text: sKey }));
                that._oForm.addContent(new Text({ text: String(oSelectedObj[sKey]) }));
            });

            this._oNavContainer.to(this._oDetailPage);
        },

        _onRowPress: function (oEvent) {
            var oItem = oEvent.getParameter("listItem");
            var oContext = oItem.getBindingContext("internal");
            var oSelectedObj = oContext.getObject();

            this._openDetailForObject(oSelectedObj);

            this.fireRowPress({
                selectedObject: oSelectedObj,
                selectedId: oSelectedObj.id || oSelectedObj.ID || oContext.getPath().split('/').pop()
            });

            this._oTable.removeSelections(true);
        },

        _onNavBack: function () {
            this._oNavContainer.back();
        },

        renderer: function (oRm, oControl) {
            oRm.openStart("div", oControl);
            oRm.openEnd();
            oRm.renderControl(oControl.getAggregation("_layout"));
            oRm.close("div");
        }
    });

});
