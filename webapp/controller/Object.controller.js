sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/routing/History",
    "sap/m/Label",
    "sap/m/Text"
], function (Controller, History, Label, Text) {
    "use strict";

    return Controller.extend("customtableapp.controller.Object", {
        onInit: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("Object").attachPatternMatched(this._onObjectMatched, this);
        },

        _onObjectMatched: function (oEvent) {
            var sObjectId = oEvent.getParameter("arguments").objectId;
            this._sObjectId = sObjectId;

            var oModel = this.getOwnerComponent().getModel();
            var aData = oModel.getProperty("/tableData");

            if (aData) {
                var oSelectedObj = aData.find(obj => obj.ID === sObjectId);
                if (oSelectedObj) {
                    this._bindForm(oSelectedObj);
                }
            }
        },

        _bindForm: function (oObject) {
            var oForm = this.byId("objectForm");
            oForm.removeAllContent();

            // Add pairs
            Object.keys(oObject).forEach(function (sKey) {
                oForm.addContent(new Label({ text: sKey }));
                oForm.addContent(new Text({ text: oObject[sKey] }));
            });
        },

        onNavBack: function () {
            var oHistory = History.getInstance();
            var sPreviousHash = oHistory.getPreviousHash();

            if (sPreviousHash !== undefined) {
                window.history.go(-1);
            } else {
                var oRouter = this.getOwnerComponent().getRouter();
                oRouter.navTo("Main", {}, true);
            }
        }
    });
});
